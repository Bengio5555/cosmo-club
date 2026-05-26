"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { MOODBOARD_MAX } from "./moodboard-config";

const STORAGE_BUCKET = "cosmoclub-images";

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
  discount_ht: number;
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
  /**
   * Commission percentage owed to a referring agency. Used to gross up
   * line totals so that, after paying the agency, the original margin is
   * preserved. 0 means no commission. Capped at 99 in the editor — math
   * collapses at 100.
   * Formula: factor = 1 / (1 − rate/100); displayed_total_ht = subtotal × factor.
   */
  commission_rate: number;
  /**
   * Acompte demandé à la signature, fraction entre 0 et 1.
   * 0.30 = 30 %. Persisté tel quel sur quotes.deposit_rate et utilisé
   * par la plaquette publique pour afficher le bloc "Acompte" et par
   * les emails de confirmation à la signature.
   */
  deposit_rate: number;
  /**
   * Locale for the public plaquette and the client email. 'fr' is the
   * default; 'en' opt-in for international clients. The signed PDF + CGV
   * remain in French regardless.
   */
  language: "fr" | "en";
  valid_until: string | null;
  /**
   * Run-of-show steps ("14:00 — Livraison"). Persisted as JSONB on
   * `quotes`. Empty array = no schedule (the public plaquette falls
   * back to the default offer photo).
   */
  schedule: ScheduleItem[];
  /**
   * Owner-picked moodboard images for the plaquette. Each entry is the
   * public URL of an image living in the `cosmoclub-images` Storage
   * bucket. Empty array = use the brand-default moodboard.
   */
  moodboard_images: string[];
  items: QuoteItemInput[];
};

export type ScheduleItem = { time: string; label: string };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Sanitize the run-of-show steps before persisting.
 * - Drops malformed or empty entries.
 * - Pads time to HH:MM (handles `9:30` and `09:30`).
 * - Caps to 30 steps so the JSON column stays small.
 */
/**
 * Sanitize the moodboard image list before persisting.
 *  - Drops anything that isn't a string URL.
 *  - Only accepts http(s) URLs or site-relative paths starting with "/".
 *  - Deduplicates and caps at MOODBOARD_MAX so the plaquette grid stays
 *    within the styled range.
 */
function sanitizeMoodboard(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const s = raw.trim();
    if (!s) continue;
    if (!/^(https?:\/\/|\/)/.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MOODBOARD_MAX) break;
  }
  return out;
}

function sanitizeSchedule(input: ScheduleItem[] | undefined): ScheduleItem[] {
  if (!Array.isArray(input)) return [];
  const out: ScheduleItem[] = [];
  for (const raw of input) {
    if (!raw) continue;
    const time = String(raw.time ?? "").trim();
    const label = String(raw.label ?? "").trim();
    if (!label) continue;
    const m = time.match(/^(\d{1,2}):?([0-5]\d)?$/);
    let normalized = "";
    if (m) {
      const hh = Math.min(23, Math.max(0, Number(m[1] ?? 0)));
      const mm = m[2] ? Number(m[2]) : 0;
      normalized = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
    out.push({ time: normalized, label: label.slice(0, 120) });
    if (out.length >= 30) break;
  }
  return out;
}

/**
 * Convert a commission percentage (e.g. 20) into the multiplier that
 * grosses up base prices so the agency's cut doesn't eat the margin.
 * 20% → 1/0.80 = 1.25 (so a base of 100 is shown to the client at 125;
 * 25 goes to the agency, 100 stays in the pocket).
 */
function commissionFactor(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) return 1;
  const safe = Math.min(99, Math.max(0, rate));
  return 100 / (100 - safe);
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
          discount_ht: item.discount_ht ?? 0,
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
        discount_ht: item.discount_ht ?? 0,
      });
      if (error) return { ok: false as const, error: error.message };
    }
  }

  // 3. Re-sum the final items for the canonical totals, then apply the
  //    commission gross-up so the stored total_ht is what the client
  //    sees after referrer markup.
  const { data: finalItems } = await supabase
    .from("quote_items")
    .select("line_total_ht")
    .eq("quote_id", id);
  const subtotalHt = round2(
    (finalItems ?? []).reduce((sum, r) => sum + (r.line_total_ht ?? 0), 0),
  );
  const tvaRate = Number.isFinite(input.tva_rate) ? input.tva_rate : 20;
  const commissionRate = Number.isFinite(input.commission_rate)
    ? Math.min(99, Math.max(0, input.commission_rate))
    : 0;
  // Acompte: clamp to [0, 1]. The DB has a CHECK constraint so an out-
  // of-range value would 500 the save anyway; we clamp here to keep
  // the user input forgiving (negative numbers, accidental 30 instead
  // of 0.30, etc).
  const depositRate = Number.isFinite(input.deposit_rate)
    ? Math.min(1, Math.max(0, input.deposit_rate))
    : 0.3;
  const totalHt = round2(subtotalHt * commissionFactor(commissionRate));
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
      commission_rate: commissionRate,
      deposit_rate: depositRate,
      language: input.language === "en" ? "en" : "fr",
      valid_until: input.valid_until,
      schedule: sanitizeSchedule(input.schedule),
      moodboard_images: sanitizeMoodboard(input.moodboard_images),
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
    .select("id,status,lead_id")
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

  // Mirror the quote transition on the linked lead so the CRM
  // pipeline stays in sync. We don't downgrade on `brouillon` resets —
  // the user may be just fixing a typo and we shouldn't undo signals.
  if (q.lead_id) {
    const leadStatusMap: Partial<Record<Quote["status"], "devis_envoye" | "gagne" | "perdu">> = {
      envoye: "devis_envoye",
      accepte: "gagne",
      refuse: "perdu",
    };
    const nextLeadStatus = leadStatusMap[nextStatus];
    if (nextLeadStatus) {
      await supabase
        .from("leads")
        .update({ status: nextLeadStatus })
        .eq("id", q.lead_id);
      revalidatePath("/dashboard/leads");
      revalidatePath(`/dashboard/leads/${q.lead_id}`);
    }
  }

  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Basic email validation — just enough to skip junk before handing it
 * to Resend (which rejects malformed addresses with a 422 anyway).
 */
function parseCcEmails(input: string[] | undefined): string[] {
  if (!input || input.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const e = String(raw ?? "").trim().toLowerCase();
    if (!e) continue;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) continue;
    if (seen.has(e)) continue;
    seen.add(e);
    out.push(e);
  }
  return out.slice(0, 5); // hard cap — sane upper bound
}

/**
 * Figer + envoyer le devis.
 *  - Transition status: brouillon → envoye (+ sent_at)
 *  - Si RESEND_API_KEY configuré et client.email présent : envoie l'email
 *    avec le lien vers la plaquette. Une liste optionnelle d'adresses CC
 *    peut être passée pour transmettre le devis à des tiers (apporteur,
 *    chef de projet client, etc.).
 *  - Retourne emailed=true si l'email est parti, false sinon (avec warning)
 */
export async function sendDevis(
  id: string,
  opts?: { cc?: string[] },
) {
  const supabase = await createClient();
  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select("id,status,number,subject,client_id,lead_id,access_token,language")
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

  // Bump the linked lead into the "devis_envoyé" pipeline stage so the
  // CRM dashboard reflects reality without a manual click.
  if (quote.lead_id) {
    await supabase
      .from("leads")
      .update({ status: "devis_envoye" })
      .eq("id", quote.lead_id);
    revalidatePath("/dashboard/leads");
    revalidatePath(`/dashboard/leads/${quote.lead_id}`);
  }

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
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
    // Public plaquette URL — append the access token so the SSR
    // route accepts the request. Devis legacy sans token reçoivent
    // un lien nu (resterait OK côté route mais ne devrait jamais
    // arriver pour un devis fraîchement créé).
    const link = quote.access_token
      ? `${origin}/devis/${quote.number}?t=${quote.access_token}`
      : `${origin}/devis/${quote.number}`;
    const firstName =
      (client as { first_name?: string | null }).first_name ?? "";
    const companyName =
      (settings as { company_name?: string | null } | null)?.company_name || "Cosmo Club Paris";

    const cc = parseCcEmails(opts?.cc);
    const isEn = quote.language === "en";
    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [client.email],
      cc: cc.length > 0 ? cc : undefined,
      subject: isEn
        ? `Your Cosmo Club Paris quote — ${quote.number}`
        : `Votre devis ${quote.number} — ${companyName}`,
      html: buildEmailHtml({
        firstName,
        subject: quote.subject,
        link,
        number: quote.number,
        sender: companyName,
        locale: isEn ? "en" : "fr",
      }),
    });
    return { ok: true as const, emailed: true, ccCount: cc.length };
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
  locale?: "fr" | "en";
}): string {
  const isEn = o.locale === "en";
  const greeting = o.firstName
    ? isEn
      ? `Hi ${o.firstName},`
      : `Bonjour ${o.firstName},`
    : isEn
      ? "Hello,"
      : "Bonjour,";
  const subjectLine =
    o.subject ||
    (isEn ? `Your quote ${o.number}` : `Votre devis ${o.number}`);
  const introCopy = isEn
    ? "Your quote is ready. You can review it, accept it or get in touch with us directly from the link below."
    : "Votre devis est prêt. Vous pouvez le consulter, l'accepter ou nous écrire directement depuis le lien ci-dessous.";
  const ctaCopy = isEn ? "View the quote" : "Voir le devis";
  const fallbackCopy = isEn
    ? "Or paste this link into your browser:"
    : "Ou copiez ce lien dans votre navigateur :";
  const footerCopy = isEn
    ? `Reference: ${o.number} · This email was sent in response to your request.`
    : `Référence : ${o.number} · Cet email vous a été envoyé suite à votre demande.`;
  return `
<!doctype html>
<html lang="${isEn ? "en" : "fr"}">
  <body style="font-family: Inter, system-ui, sans-serif; background:#f5efe0; margin:0; padding:32px; color:#2a1f14;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
      <tr>
        <td style="padding:32px 32px 8px;">
          <p style="font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#8b1a1a; margin:0 0 12px;">${escape(o.sender)}</p>
          <h1 style="font-family:Georgia,serif; font-size:28px; line-height:1.2; margin:0 0 18px; color:#2a1f14;">${escape(subjectLine)}</h1>
          <p style="margin:0 0 12px;">${escape(greeting)}</p>
          <p style="margin:0 0 12px;">${escape(introCopy)}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 32px;">
          <a href="${o.link}" style="display:inline-block; padding:14px 28px; background:#8b1a1a; color:#f5efe0; text-decoration:none; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;">
            ${escape(ctaCopy)}
          </a>
          <p style="margin:24px 0 0; font-size:12px; color:#3a2a1e; opacity:0.7;">
            ${escape(fallbackCopy)} <br/>
            <a href="${o.link}" style="color:#8b1a1a;">${o.link}</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px; background:#f5efe0; font-size:11px; color:#3a2a1e; opacity:0.7;">
          ${escape(footerCopy)}
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

/**
 * Créer une facture brouillon à partir d'un devis accepté.
 *  - Mint un numéro de facture continu via next_invoice_number()
 *  - Copie la liste des items (snapshot — les modifs futures du devis ne
 *    se répercutent pas sur la facture)
 *  - Pré-remplit subject/event_date/due_date à partir du devis +
 *    settings.invoice_due_days
 *  - Ne duplique PAS si une facture existe déjà pour ce devis (retour ok
 *    avec l'id existant, on renvoie vers la fiche)
 */
export async function createInvoiceFromQuote(quoteId: string) {
  const supabase = await createClient();

  const { data: quote, error: qErr } = await supabase
    .from("quotes")
    .select(
      "id,number,status,client_id,event_date,subject,terms,tva_rate,commission_rate,total_ht,total_tva,total_ttc",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (qErr || !quote) {
    return { ok: false as const, error: qErr?.message ?? "Devis introuvable" };
  }
  if (quote.status !== "accepte") {
    return {
      ok: false as const,
      error: "La facture se crée depuis un devis accepté uniquement.",
    };
  }

  // Skip duplication if a facture already exists for this quote.
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("quote_id", quoteId)
    .maybeSingle();
  if (existing) {
    return { ok: true as const, invoiceId: existing.id, created: false };
  }

  // Mint the next invoice number (SECURITY DEFINER function).
  const { data: nbr, error: nbrErr } = await supabase.rpc("next_invoice_number");
  if (nbrErr || !nbr) {
    return { ok: false as const, error: nbrErr?.message ?? "Numérotation impossible" };
  }

  // Due date = today + settings.invoice_due_days (default 30).
  const { data: settings } = await supabase
    .from("settings")
    .select("invoice_due_days")
    .eq("id", 1)
    .maybeSingle();
  const dueDays = settings?.invoice_due_days ?? 30;
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + dueDays);

  const { data: invoice, error: iErr } = await supabase
    .from("invoices")
    .insert({
      number: nbr,
      quote_id: quote.id,
      client_id: quote.client_id,
      status: "brouillon",
      issue_date: issueDate.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      event_date: quote.event_date,
      subject: quote.subject,
      terms: quote.terms,
      tva_rate: quote.tva_rate,
      total_ht: quote.total_ht,
      total_tva: quote.total_tva,
      total_ttc: quote.total_ttc,
      // IDOR protection: random token required in /factures/[number]?t=<token>.
      access_token: crypto.randomUUID(),
    })
    .select("id")
    .single();
  if (iErr || !invoice) {
    return { ok: false as const, error: iErr?.message ?? "Création facture échouée" };
  }

  // Copy the items (snapshot).
  const { data: items } = await supabase
    .from("quote_items")
    .select("position,title,description,qty,unit,unit_price_ht,discount_ht")
    .eq("quote_id", quote.id)
    .order("position", { ascending: true });

  if (items && items.length > 0) {
    // Quote items are stored at base prices; the agency commission is
    // applied at the totals level (quote.total_ht is already grossed up).
    // The invoice keeps no commission concept of its own — it's just a
    // snapshot — so we bake the gross-up into each line's unit_price_ht
    // (and discount, in proportion) here so the printed invoice's lines
    // add up to its total_ht.
    const factor = commissionFactor(Number(quote.commission_rate ?? 0));
    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      items.map((it) => ({
        invoice_id: invoice.id,
        position: it.position,
        title: it.title,
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        unit_price_ht: round2(Number(it.unit_price_ht ?? 0) * factor),
        discount_ht: round2(Number(it.discount_ht ?? 0) * factor),
      })),
    );
    if (itemsErr) return { ok: false as const, error: itemsErr.message };
  }

  revalidatePath(`/dashboard/devis/${quoteId}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");

  return { ok: true as const, invoiceId: invoice.id, created: true };
}

/**
 * Filename prefix for moodboard images uploaded directly from a devis
 * editor. Stored in the same `cosmoclub-images` bucket but excluded
 * from the public event-gallery listing thanks to the generic
 * `{page}__{key}__` filter (`devis-moodboard__{quoteId}__…`).
 */
function moodboardUploadPrefix(quoteId: string): string {
  return `devis-moodboard__${quoteId}__`;
}

/**
 * Upload a one-off photo for a specific devis's moodboard from the
 * editor. Lands in the shared bucket with a `devis-moodboard__{id}__`
 * prefix so it never pollutes the public event gallery.
 *
 * Returns the public URL of the freshly uploaded image so the picker
 * can append it to the selection immediately.
 */
export async function uploadMoodboardImage(quoteId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié" };

  if (!quoteId) return { ok: false as const, error: "Devis manquant." };

  const file = formData.get("file");
  if (!(file instanceof File))
    return { ok: false as const, error: "Fichier manquant." };
  if (!file.type.startsWith("image/"))
    return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > 10 * 1024 * 1024)
    return { ok: false as const, error: "Image trop lourde (max 10 Mo)." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const slug =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "photo";
  const filename = `${moodboardUploadPrefix(quoteId)}${slug}-${Date.now()}.${ext}`;

  try {
    const adminSupabase = createAdminClient();
    const buffer = await file.arrayBuffer();
    const { error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });
    if (error) return { ok: false as const, error: error.message };

    const { data: pub } = adminSupabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    if (!pub?.publicUrl) {
      return { ok: false as const, error: "URL publique introuvable." };
    }

    revalidatePath(`/dashboard/devis/${quoteId}`);
    return {
      ok: true as const,
      image: { url: pub.publicUrl, name: slug },
    };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec d'upload.",
    };
  }
}

/**
 * List the per-devis moodboard uploads (files prefixed with
 * `devis-moodboard__{quoteId}__`). Returned so the picker can keep
 * showing them on subsequent edits.
 */
export async function listMoodboardUploads(quoteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié", images: [] };

  try {
    const adminSupabase = createAdminClient();
    const { data: files, error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .list("", {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
        search: moodboardUploadPrefix(quoteId),
      });
    if (error) {
      return { ok: false as const, error: error.message, images: [] };
    }

    const prefix = moodboardUploadPrefix(quoteId);
    const images: { url: string; name: string }[] = [];
    for (const file of files ?? []) {
      if (!file.name?.startsWith(prefix)) continue;
      const { data: pub } = adminSupabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(file.name);
      if (pub?.publicUrl) {
        images.push({
          url: pub.publicUrl,
          name: file.name.slice(prefix.length).replace(/\.[^.]+$/, ""),
        });
      }
    }
    return { ok: true as const, images };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Listing échoué.",
      images: [],
    };
  }
}

/**
 * List images available for the moodboard picker — the event-gallery
 * photos that live in the `cosmoclub-images` Storage bucket without a
 * `{page}__{key}__` prefix (those prefixed ones are slot-targeted
 * uploads for the public site and don't belong in an event moodboard).
 *
 * Returns `{ url, name }[]`, newest first.
 */
export async function listEventImages() {
  // Authenticated owners only — same gate as the rest of the editor.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié", images: [] };

  try {
    const adminSupabase = createAdminClient();
    const { data: files, error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .list("", {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (error) {
      return { ok: false as const, error: error.message, images: [] };
    }

    const images: { url: string; name: string }[] = [];
    for (const file of files ?? []) {
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      // Skip slot-targeted uploads (page__key__name.ext) — those are
      // bound to a specific public-site slot, not gallery photos.
      if (/^[^_]+__[^_]+__/.test(file.name)) continue;
      const { data: pub } = adminSupabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(file.name);
      if (pub?.publicUrl) {
        images.push({
          url: pub.publicUrl,
          name: file.name.replace(/\.[^.]+$/, ""),
        });
      }
    }
    return { ok: true as const, images };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Listing échoué.",
      images: [],
    };
  }
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

/**
 * Duplicate an existing quote into a fresh `brouillon`. Use case: repeat
 * clients who reorder the same package — copy the source quote, swap
 * the dates, send. Carries over the commercial substance (line items,
 * client, subject, intro, terms, TVA/commission/deposit rates,
 * schedule, moodboard) but RESETS everything tied to the previous
 * lifecycle: status returns to brouillon, dates to today, audit trail
 * stripped (sent_at/accepted_at/refused_at, signature data, CGV
 * acceptance, generated PDF URL). A new access_token is minted so the
 * old public URL keeps working for the original quote.
 *
 * The new quote is intentionally NOT linked to any lead — the source
 * lead pipeline shouldn't shift because of a copy. The operator can
 * relink manually if they want to.
 */
export async function duplicateQuote(id: string) {
  const supabase = await createClient();

  const { data: source, error: qErr } = await supabase
    .from("quotes")
    .select("id,client_id,event_type,event_date,event_location,guests_count,subject,intro,terms,tva_rate,commission_rate,deposit_rate,language,schedule,moodboard_images,total_ht,total_tva,total_ttc")
    .eq("id", id)
    .maybeSingle();
  if (qErr || !source) {
    return { ok: false as const, error: qErr?.message ?? "Devis introuvable" };
  }

  const { data: items, error: iErr } = await supabase
    .from("quote_items")
    .select(
      "position,section,title,description,qty,unit,unit_price_ht,discount_ht",
    )
    .eq("quote_id", id)
    .order("position", { ascending: true });
  if (iErr) {
    return { ok: false as const, error: iErr.message };
  }

  // Mint the next quote number (SECURITY DEFINER function — same path
  // every other quote-creation flow uses).
  const { data: nbr, error: nbrErr } = await supabase.rpc("next_quote_number");
  if (nbrErr || !nbr) {
    return {
      ok: false as const,
      error: nbrErr?.message ?? "Numérotation impossible",
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: created, error: cErr } = await supabase
    .from("quotes")
    .insert({
      number: nbr,
      client_id: source.client_id,
      lead_id: null,
      status: "brouillon",
      issue_date: today,
      event_type: source.event_type,
      // Reset event date — most repeat clients want the same package
      // on a different date, so blanking it forces the operator to
      // pick the new one and avoids accidentally re-using the old one.
      event_date: null,
      event_location: source.event_location,
      guests_count: source.guests_count,
      subject: source.subject ? `Copie — ${source.subject}` : null,
      intro: source.intro,
      terms: source.terms,
      tva_rate: source.tva_rate,
      commission_rate: source.commission_rate,
      deposit_rate: source.deposit_rate,
      language: source.language,
      schedule: source.schedule,
      moodboard_images: source.moodboard_images,
      total_ht: source.total_ht,
      total_tva: source.total_tva,
      total_ttc: source.total_ttc,
      access_token: crypto.randomUUID(),
    })
    .select("id")
    .single();
  if (cErr || !created) {
    return {
      ok: false as const,
      error: cErr?.message ?? "Création du duplicata échouée",
    };
  }

  if (items && items.length > 0) {
    const { error: insErr } = await supabase.from("quote_items").insert(
      items.map((it) => ({
        quote_id: created.id,
        position: it.position,
        section: it.section,
        title: it.title,
        description: it.description,
        qty: it.qty,
        unit: it.unit,
        unit_price_ht: it.unit_price_ht,
        discount_ht: it.discount_ht,
      })),
    );
    if (insErr) {
      // Roll back the empty quote rather than leave the operator with a
      // copy missing its line items.
      await supabase.from("quotes").delete().eq("id", created.id);
      return { ok: false as const, error: insErr.message };
    }
  }

  revalidatePath("/dashboard/devis");
  return { ok: true as const, id: created.id };
}
