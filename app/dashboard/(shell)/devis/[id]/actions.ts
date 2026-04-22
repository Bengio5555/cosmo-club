"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Quote = Database["public"]["Tables"]["quotes"]["Row"];
type QuoteItemInput = {
  id?: string; // Existing item id when editing; omitted for new items.
  position: number;
  section: string | null;
  title: string;
  description: string | null;
  qty: number;
  unit: string | null;
  unit_price_ht: number;
};

export type SaveQuoteInput = {
  // Metadata
  subject: string | null;
  intro: string | null;
  terms: string | null;
  event_type: Database["public"]["Enums"]["event_type"] | null;
  event_date: string | null;
  event_location: string | null;
  guests_count: number | null;
  tva_rate: number;
  valid_until: string | null;
  items: QuoteItemInput[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Save the whole devis in one go: metadata + item reconciliation.
 * - Items with an existing id are updated
 * - Items without id are inserted
 * - Items that used to exist but are not in the payload are deleted
 * - Totals are recomputed from the final items and written on the quote row
 *
 * Locks out after the devis has been sent (status != 'brouillon') — only
 * metadata like valid_until and intro could be revisited, but for now we
 * keep it simple and disable all edits until the status flow unlocks them.
 */
export async function saveQuote(id: string, input: SaveQuoteInput) {
  const supabase = await createClient();

  const { data: current, error: readErr } = await supabase
    .from("quotes")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !current) {
    return { ok: false as const, error: readErr?.message ?? "Devis introuvable" };
  }
  if (current.status !== "brouillon") {
    return {
      ok: false as const,
      error: `Le devis est verrouillé (${current.status}). Rouvre-le en brouillon pour l'éditer.`,
    };
  }

  // 1. Fetch existing items so we can compute what to delete.
  const { data: existing } = await supabase
    .from("quote_items")
    .select("id")
    .eq("quote_id", id);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const keptIds = new Set(input.items.map((i) => i.id).filter((x): x is string => !!x));
  const toDelete = [...existingIds].filter((x) => !keptIds.has(x));

  if (toDelete.length > 0) {
    const { error } = await supabase.from("quote_items").delete().in("id", toDelete);
    if (error) return { ok: false as const, error: error.message };
  }

  // 2. Upsert items one by one — keeps the code simple and lets generated
  //    columns (line_total_ht) recompute. Update first, insert the new ones.
  for (const item of input.items) {
    if (item.id && existingIds.has(item.id)) {
      const { error } = await supabase
        .from("quote_items")
        .update({
          position: item.position,
          section: item.section,
          title: item.title,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unit_price_ht: item.unit_price_ht,
        })
        .eq("id", item.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabase.from("quote_items").insert({
        quote_id: id,
        position: item.position,
        section: item.section,
        title: item.title,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_price_ht: item.unit_price_ht,
      });
      if (error) return { ok: false as const, error: error.message };
    }
  }

  // 3. Re-sum the final items for the canonical totals.
  const { data: finalItems } = await supabase
    .from("quote_items")
    .select("line_total_ht")
    .eq("quote_id", id);
  const totalHt = round2(
    (finalItems ?? []).reduce((sum, r) => sum + (r.line_total_ht ?? 0), 0),
  );
  const tvaRate = Number.isFinite(input.tva_rate) ? input.tva_rate : 20;
  const totalTva = round2((totalHt * tvaRate) / 100);
  const totalTtc = round2(totalHt + totalTva);

  // 4. Persist quote metadata + new totals in a single update.
  const { error: upErr } = await supabase
    .from("quotes")
    .update({
      subject: input.subject,
      intro: input.intro,
      terms: input.terms,
      event_type: input.event_type,
      event_date: input.event_date,
      event_location: input.event_location,
      guests_count: input.guests_count,
      tva_rate: tvaRate,
      valid_until: input.valid_until,
      total_ht: totalHt,
      total_tva: totalTva,
      total_ttc: totalTtc,
    })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Status transitions. Kept deliberately narrow so the state machine
 * doesn't drift. Transitions:
 *  brouillon  → envoye
 *  envoye     → accepte | refuse | brouillon
 *  accepte    → brouillon (unlock for amendment)
 *  refuse     → brouillon
 *  expire     → brouillon
 */
export async function setQuoteStatus(
  id: string,
  nextStatus: Quote["status"],
) {
  const supabase = await createClient();
  const { data: q, error } = await supabase
    .from("quotes")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (error || !q) {
    return { ok: false as const, error: error?.message ?? "Devis introuvable" };
  }
  const allowed: Record<Quote["status"], Quote["status"][]> = {
    brouillon: ["envoye"],
    envoye: ["accepte", "refuse", "brouillon"],
    accepte: ["brouillon"],
    refuse: ["brouillon"],
    expire: ["brouillon"],
  };
  if (!allowed[q.status].includes(nextStatus)) {
    return {
      ok: false as const,
      error: `Transition interdite: ${q.status} → ${nextStatus}`,
    };
  }

  const patch: Database["public"]["Tables"]["quotes"]["Update"] = { status: nextStatus };
  if (nextStatus === "envoye") patch.sent_at = new Date().toISOString();
  if (nextStatus === "accepte") patch.accepted_at = new Date().toISOString();
  if (nextStatus === "refuse") patch.refused_at = new Date().toISOString();

  const { error: upErr } = await supabase.from("quotes").update(patch).eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Figer + envoyer le devis.
 *  - Transition status: brouillon → envoye (+ sent_at)
 *  - Si RESEND_API_KEY configuré et client.email présent : envoie l'email
 *    avec le lien vers la plaquette
 *  - Retourne emailed=true si l'email est parti, false sinon (avec warning)
 */
export async function sendDevis(id: string) {
  const supabase = await createClient();
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("id,status,number,subject,client_id")
    .eq("id", id)
    .maybeSingle();
  if (qErr || !quote) {
    return { ok: false as const, error: qErr?.message ?? "Devis introuvable" };
  }
  if (quote.status !== "brouillon") {
    return {
      ok: false as const,
      error: `Transition interdite: ${quote.status} → envoye`,
    };
  }

  // Fetch client + sender settings in parallel.
  const [{ data: client }, { data: settings }] = await Promise.all([
    quote.client_id
      ? supabase.from("clients").select("first_name,last_name,company_name,email").eq("id", quote.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("settings").select("company_name,email").eq("id", 1).maybeSingle(),
  ]);

  // Flip the DB state first so the plaquette becomes publicly visible.
  const { error: upErr } = await supabase
    .from("quotes")
    .update({ status: "envoye", sent_at: new Date().toISOString() })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  // Revalidate right away so the UI reflects the new state even if the
  // email send fails.
  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath(`/devis/${quote.number}`);
  revalidatePath("/dashboard");

  // Try the email (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "devis@cosmoclub.fr";
  if (!apiKey) {
    return {
      ok: true as const,
      emailed: false,
      warning: "RESEND_API_KEY non configurée — email non envoyé.",
    };
  }
  if (!client?.email) {
    return {
      ok: true as const,
      emailed: false,
      warning: "Aucun email client renseigné — plaquette publiée sans envoi.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://cosmo-club.vercel.app";
    const link = `${origin}/devis/${quote.number}`;
    const firstName =
      (client as { first_name?: string | null }).first_name ?? "";
    const companyName =
      (settings as { company_name?: string | null } | null)?.company_name || "Cosmo Club Paris";

    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [client.email],
      subject: `Votre devis ${quote.number} — ${companyName}`,
      html: buildEmailHtml({
        firstName,
        subject: quote.subject,
        link,
        number: quote.number,
        sender: companyName,
      }),
    });
    return { ok: true as const, emailed: true };
  } catch (err) {
    console.error("[sendDevis] resend error:", err);
    return {
      ok: true as const,
      emailed: false,
      warning: "Email non envoyé (erreur Resend) — la plaquette est quand même publiée.",
    };
  }
}

function buildEmailHtml(o: {
  firstName: string;
  subject: string | null;
  link: string;
  number: string;
  sender: string;
}): string {
  const greeting = o.firstName ? `Bonjour ${o.firstName},` : "Bonjour,";
  const subjectLine = o.subject || `Votre devis ${o.number}`;
  return `
<!doctype html>
<html>
  <body style="font-family: Inter, system-ui, sans-serif; background:#f5efe0; margin:0; padding:32px; color:#2a1f14;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;">
          <p style="font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#8b1a1a; margin:0 0 12px;">${escape(o.sender)}</p>
          <h1 style="font-family:Georgia,serif; font-size:28px; line-height:1.2; margin:0 0 18px; color:#2a1f14;">${escape(subjectLine)}</h1>
          <p style="margin:0 0 12px;">${escape(greeting)}</p>
          <p style="margin:0 0 12px;">Votre devis est prêt. Vous pouvez le consulter, l'accepter ou nous écrire directement depuis le lien ci-dessous.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 32px;">
          <a href="${o.link}" style="display:inline-block; padding:14px 28px; background:#8b1a1a; color:#f5efe0; text-decoration:none; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;">
            Voir le devis
          </a>
          <p style="margin:24px 0 0; font-size:12px; color:#3a2a1e; opacity:0.7;">
            Ou copiez ce lien dans votre navigateur : <br/>
            <a href="${o.link}" style="color:#8b1a1a;">${o.link}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px; background:#f5efe0; font-size:11px; color:#3a2a1e; opacity:0.7;">
          Référence : ${escape(o.number)} · Cet email vous a été envoyé suite à votre demande.
        </td>
      </tr>
    </table>
  </body>
</html>`.trim();
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function deleteQuote(id: string) {
  const supabase = await createClient();
  const { data: q } = await supabase.from("quotes").select("id,status,lead_id").eq("id", id).maybeSingle();
  if (!q) return { ok: false as const, error: "Devis introuvable" };
  if (q.status !== "brouillon") {
    return { ok: false as const, error: "Seuls les brouillons peuvent être supprimés" };
  }
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  // Optional: revert the lead's status back to "contacte" if it was flipped
  // on conversion. Safe to keep as-is; the owner can change it manually.
  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/leads/${q.lead_id}`);
  return { ok: true as const };
}
