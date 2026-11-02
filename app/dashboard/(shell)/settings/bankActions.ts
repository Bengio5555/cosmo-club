"use server";

import { revalidatePath } from "next/cache";
import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidBic, isValidIban, maskEmail, maskIban, normalizeBic, normalizeIban } from "@/lib/iban";

/** Durée de validité d'un code, essais par code, codes par heure. */
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_HOUR = 3;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fail = { ok: false; error: string };

const hashCode = (requestId: string, code: string) =>
  createHash("sha256").update(`${requestId}:${code}`).digest("hex");

/**
 * Seul le propriétaire change l'IBAN. Le rôle est relu en base à chaque
 * appel ; l'adresse du code est celle du compte Supabase (modifiable
 * seulement avec une confirmation par e-mail), pas un champ des Paramètres.
 */
async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Session expirée." } as const;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "owner") return { error: "Seul le propriétaire peut changer l'IBAN." } as const;
  return { userId: user.id, email: user.email } as const;
}

async function sendMail(to: string[], subject: string, lines: string[]) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY manquante.");
  const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#111827;">${lines
    .map((l) => `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;">${escapeHtml(l)}</p>`)
    .join("")}</div>`;
  const { error } = await new Resend(apiKey).emails.send({
    from: `Cosmo Club Paris <${fromEmail}>`,
    to,
    subject,
    text: lines.join("\n\n"),
    html,
  });
  if (error) throw new Error(error.message);
}

/**
 * Étape 1 : contrôle le nouvel IBAN et envoie un code à 6 chiffres sur
 * l'e-mail du propriétaire. Rien ne change tant que le code n'est pas saisi.
 */
export async function requestBankChange(input: {
  iban: string;
  bic: string;
}): Promise<{ ok: true; requestId: string; sentTo: string } | Fail> {
  const owner = await requireOwner();
  if (owner.error) return { ok: false, error: owner.error };

  const iban = normalizeIban(input.iban);
  const bic = input.bic.trim() ? normalizeBic(input.bic) : null;
  if (!isValidIban(iban)) return { ok: false, error: "IBAN invalide : vérifie chaque caractère." };
  if (bic && !isValidBic(bic)) return { ok: false, error: "BIC invalide (8 ou 11 caractères)." };

  const admin = createAdminClient();
  const { data: current } = await admin.from("settings").select("iban,bic").eq("id", 1).maybeSingle();
  if (normalizeIban(current?.iban ?? "") === iban && (current?.bic ?? null) === bic) {
    return { ok: false, error: "C'est déjà l'IBAN enregistré." };
  }

  const hourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count } = await admin
    .from("bank_change_requests")
    .select("id", { count: "exact", head: true })
    .eq("requested_by", owner.userId)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_REQUESTS_PER_HOUR) {
    return { ok: false, error: "Trop de codes demandés. Réessaie dans une heure." };
  }

  const requestId = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: insError } = await admin.from("bank_change_requests").insert({
    id: requestId,
    requested_by: owner.userId,
    new_iban: iban,
    new_bic: bic,
    code_hash: hashCode(requestId, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (insError) {
    return {
      ok: false,
      error: insError.message.includes("bank_change_requests")
        ? "Base pas à jour : applique la migration 2026-10-28_bank_protection.sql."
        : insError.message,
    };
  }

  try {
    await sendMail([owner.email], `${code} : code pour changer l'IBAN`, [
      `Code de confirmation : ${code}`,
      `Il sert à remplacer l'IBAN des factures par ${maskIban(iban)}. Il expire dans 10 minutes.`,
      "Si tu n'es pas à l'origine de cette demande, ne saisis pas ce code et change ton mot de passe du dashboard.",
    ]);
  } catch (err) {
    console.error("[requestBankChange] e-mail:", err);
    await admin.from("bank_change_requests").delete().eq("id", requestId);
    return { ok: false, error: "Le code n'a pas pu partir. Réessaie dans un instant." };
  }

  return { ok: true, requestId, sentTo: maskEmail(owner.email) };
}

/**
 * Étape 2 : vérifie le code (5 essais, 10 minutes), enregistre l'IBAN par
 * la clé de service (seule autorisée par la base) et prévient les
 * propriétaires et l'adresse de contact.
 */
export async function confirmBankChange(input: {
  requestId: string;
  code: string;
}): Promise<{ ok: true; iban: string } | Fail> {
  const owner = await requireOwner();
  if (owner.error) return { ok: false, error: owner.error };
  if (!UUID_RE.test(input.requestId)) return { ok: false, error: "Demande introuvable." };
  const code = input.code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Le code fait 6 chiffres." };

  const admin = createAdminClient();
  const { data: req } = await admin
    .from("bank_change_requests")
    .select("id,requested_by,new_iban,new_bic,code_hash,attempts,expires_at,used_at")
    .eq("id", input.requestId)
    .maybeSingle();
  if (!req || req.requested_by !== owner.userId) return { ok: false, error: "Demande introuvable." };
  if (req.used_at) return { ok: false, error: "Ce code a déjà servi." };
  if (new Date(req.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expiré : demandes-en un nouveau." };
  }
  if (req.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Trop d'essais : demandes un nouveau code." };

  // L'essai est compté avant la comparaison, de façon atomique.
  const { data: counted } = await admin
    .from("bank_change_requests")
    .update({ attempts: req.attempts + 1 })
    .eq("id", req.id)
    .eq("attempts", req.attempts)
    .select("id");
  if (!counted?.length) return { ok: false, error: "Réessaie dans un instant." };

  const expected = Buffer.from(req.code_hash, "hex");
  const given = Buffer.from(hashCode(req.id, code), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    const left = MAX_ATTEMPTS - req.attempts - 1;
    return {
      ok: false,
      error: left > 0 ? `Code incorrect. Encore ${left} essai${left > 1 ? "s" : ""}.` : "Code incorrect. Demande un nouveau code.",
    };
  }

  const { data: claimed } = await admin
    .from("bank_change_requests")
    .update({ used_at: new Date().toISOString() })
    .eq("id", req.id)
    .is("used_at", null)
    .select("id");
  if (!claimed?.length) return { ok: false, error: "Ce code a déjà servi." };

  const { data: before } = await admin.from("settings").select("iban,email").eq("id", 1).maybeSingle();
  const { error: upError } = await admin
    .from("settings")
    .update({
      iban: req.new_iban,
      bic: req.new_bic,
      bank_updated_at: new Date().toISOString(),
      bank_updated_by: owner.userId,
    })
    .eq("id", 1);
  if (upError) return { ok: false, error: upError.message };

  // Alerte : tous les propriétaires et l'adresse de contact.
  const { data: owners } = await admin.from("profiles").select("email").eq("role", "owner");
  const to = [...new Set([owner.email, ...(owners ?? []).map((o) => o.email), before?.email ?? ""])].filter((e) =>
    e.includes("@"),
  );
  try {
    await sendMail(to, "IBAN modifié dans le dashboard Cosmo Club", [
      `L'IBAN des factures vient d'être changé par ${owner.email}.`,
      `Ancien : ${maskIban(before?.iban)} · Nouveau : ${maskIban(req.new_iban)}`,
      "Si ce n'est pas toi, connecte-toi au dashboard, remets le bon IBAN et change ton mot de passe.",
    ]);
  } catch (err) {
    console.error("[confirmBankChange] alerte:", err);
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, iban: req.new_iban };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
