"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];
type InvoiceItemInput = {
  id?: string;
  position: number;
  title: string;
  description: string | null;
  qty: number;
  unit: string | null;
  unit_price_ht: number;
};

export type SaveInvoiceInput = {
  subject: string | null;
  terms: string | null;
  event_date: string | null;
  event_end_date: string | null;
  issue_date: string;
  due_date: string | null;
  tva_rate: number;
  items: InvoiceItemInput[];
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Save an invoice in draft. Mirrors saveQuote's reconciliation strategy:
 * delete removed items, update kept, insert new, recompute totals from
 * the generated line_total_ht column. Guards against edits once the
 * invoice has left the brouillon status (the DB trigger
 * prevent_locked_invoice_edits also enforces this at the write layer).
 */
export async function saveInvoice(id: string, input: SaveInvoiceInput) {
  const supabase = await createClient();

  const { data: current, error: readErr } = await supabase
    .from("invoices")
    .select("id,status,discount_global_pct")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !current) {
    return { ok: false as const, error: readErr?.message ?? "Facture introuvable" };
  }
  if (current.status !== "brouillon") {
    return {
      ok: false as const,
      error: `Facture verrouillée (${current.status}). Une facture émise est immuable — utilise un avoir pour modifier.`,
    };
  }

  // Reconcile items.
  const { data: existing } = await supabase
    .from("invoice_items")
    .select("id")
    .eq("invoice_id", id);
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const keptIds = new Set(input.items.map((i) => i.id).filter((x): x is string => !!x));
  const toDelete = [...existingIds].filter((x) => !keptIds.has(x));

  if (toDelete.length > 0) {
    const { error } = await supabase.from("invoice_items").delete().in("id", toDelete);
    if (error) return { ok: false as const, error: error.message };
  }

  for (const item of input.items) {
    if (item.id && existingIds.has(item.id)) {
      const { error } = await supabase
        .from("invoice_items")
        .update({
          position: item.position,
          title: item.title,
          description: item.description,
          qty: item.qty,
          unit: item.unit,
          unit_price_ht: item.unit_price_ht,
        })
        .eq("id", item.id);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { error } = await supabase.from("invoice_items").insert({
        invoice_id: id,
        position: item.position,
        title: item.title,
        description: item.description,
        qty: item.qty,
        unit: item.unit,
        unit_price_ht: item.unit_price_ht,
      });
      if (error) return { ok: false as const, error: error.message };
    }
  }

  // Recompute totals from the canonical generated column. Preserve
  // the frozen `discount_global_pct` inherited from the source quote —
  // operators don't edit it on draft invoices, but the math must apply
  // it so the totals stay coherent with what the client signed.
  const { data: finalItems } = await supabase
    .from("invoice_items")
    .select("line_total_ht")
    .eq("invoice_id", id);
  const subtotalHt = round2(
    (finalItems ?? []).reduce((sum, r) => sum + (r.line_total_ht ?? 0), 0),
  );
  const tvaRate = Number.isFinite(input.tva_rate) ? input.tva_rate : 20;
  const discountGlobalPct = Math.min(
    100,
    Math.max(0, Number(current.discount_global_pct ?? 0)),
  );
  const totalHt = round2(subtotalHt * (1 - discountGlobalPct / 100));
  const totalTva = round2((totalHt * tvaRate) / 100);
  const totalTtc = round2(totalHt + totalTva);

  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      subject: input.subject,
      terms: input.terms,
      event_date: input.event_date,
      event_end_date:
        input.event_end_date &&
        input.event_date &&
        input.event_end_date > input.event_date
          ? input.event_end_date
          : null,
      issue_date: input.issue_date,
      due_date: input.due_date,
      tva_rate: tvaRate,
      total_ht: totalHt,
      total_tva: totalTva,
      total_ttc: totalTtc,
    })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath(`/dashboard/factures/${id}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/**
 * Narrow state machine for invoices:
 *   brouillon → envoye  (triggers legal snapshot stamping, email)
 *   envoye    → paye | annule | en_retard
 *   en_retard → paye | annule
 *   paye/annule → terminal (no reverse to stay legally clean)
 *
 * We expose a single function but callers choose the target; invalid
 * transitions are rejected.
 */
export async function setInvoiceStatus(id: string, nextStatus: InvoiceStatus) {
  const supabase = await createClient();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (error || !inv) {
    return { ok: false as const, error: error?.message ?? "Facture introuvable" };
  }
  const allowed: Record<InvoiceStatus, InvoiceStatus[]> = {
    brouillon: ["envoye", "annule"],
    envoye: ["paye", "annule", "en_retard"],
    en_retard: ["paye", "annule"],
    paye: [],
    annule: [],
  };
  if (!allowed[inv.status].includes(nextStatus)) {
    return {
      ok: false as const,
      error: `Transition interdite: ${inv.status} → ${nextStatus}`,
    };
  }

  const patch: Database["public"]["Tables"]["invoices"]["Update"] = { status: nextStatus };
  if (nextStatus === "paye") patch.paid_at = new Date().toISOString();

  const { error: upErr } = await supabase.from("invoices").update(patch).eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath(`/dashboard/factures/${id}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function markInvoicePaid(id: string) {
  return setInvoiceStatus(id, "paye");
}

/**
 * Figer + envoyer la facture par email.
 *   - brouillon → envoye (status + sent_at stamp)
 *   - snapshot legal settings on the invoice row (so the archived invoice
 *     keeps the exact company details that existed at issuance, even if
 *     the owner later updates SIRET / IBAN)
 *   - best-effort Resend email with a link to the public invoice
 */
export async function sendInvoice(id: string) {
  const supabase = await createClient();
  const { data: invoice, error: iErr } = await supabase
    .from("invoices")
    .select("id,status,number,subject,client_id,due_date,access_token")
    .eq("id", id)
    .maybeSingle();
  if (iErr || !invoice) {
    return { ok: false as const, error: iErr?.message ?? "Facture introuvable" };
  }
  if (invoice.status !== "brouillon") {
    return {
      ok: false as const,
      error: `Transition interdite: ${invoice.status} → envoye`,
    };
  }

  const [{ data: client }, { data: settings }] = await Promise.all([
    invoice.client_id
      ? supabase.from("clients").select("first_name,last_name,company_name,email").eq("id", invoice.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  // Freeze the legal snapshot on the invoice row for posterity.
  const legalSnapshot = settings
    ? {
        company_name: settings.company_name,
        legal_form: settings.legal_form,
        siret: settings.siret,
        tva_intracom: settings.tva_intracom,
        tva_franchise: settings.tva_franchise,
        address_line1: settings.address_line1,
        address_line2: settings.address_line2,
        postal_code: settings.postal_code,
        city: settings.city,
        country: settings.country,
        email: settings.email,
        phone: settings.phone,
        iban: settings.iban,
        bic: settings.bic,
        penalty_rate_text: settings.penalty_rate_text,
      }
    : null;

  const { error: upErr } = await supabase
    .from("invoices")
    .update({
      status: "envoye",
      sent_at: new Date().toISOString(),
      legal_snapshot: legalSnapshot,
    })
    .eq("id", id);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath(`/dashboard/factures/${id}`);
  revalidatePath("/dashboard/factures");
  revalidatePath(`/factures/${invoice.number}`);
  revalidatePath("/dashboard");

  // Email (best-effort).
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "factures@cosmoclub.fr";
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
      warning: "Aucun email client — facture publiée sans envoi.",
    };
  }

  try {
    const resend = new Resend(apiKey);
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
    const link = invoice.access_token
      ? `${origin}/factures/${invoice.number}?t=${invoice.access_token}`
      : `${origin}/factures/${invoice.number}`;
    const firstName = (client as { first_name?: string | null }).first_name ?? "";
    const companyName = legalSnapshot?.company_name || "Cosmo Club Paris";
    const subjectLine = invoice.subject || `Facture ${invoice.number}`;
    const dueLine = invoice.due_date
      ? `Échéance : ${new Date(invoice.due_date).toLocaleDateString("fr-FR")}`
      : "Paiement à réception.";

    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [client.email],
      subject: `${companyName} — ${subjectLine}`,
      html: buildInvoiceEmailHtml({
        firstName,
        subjectLine,
        number: invoice.number,
        dueLine,
        link,
        sender: companyName,
      }),
    });
    return { ok: true as const, emailed: true };
  } catch (err) {
    console.error("[sendInvoice] resend error:", err);
    return {
      ok: true as const,
      emailed: false,
      warning: "Email non envoyé (Resend) — facture quand même publiée.",
    };
  }
}

/**
 * Créer un avoir (credit note) à partir d'une facture émise.
 *  - Duplique items et totaux de la facture source
 *  - Négation des quantités → le TTC devient négatif par défaut
 *  - Status `brouillon`; l'owner peut ensuite ajuster pour un avoir partiel
 *  - Numérotation dédiée AV-YYYY-NNNNN (séquence annuelle)
 *  - Le `reason` est stocké pour traçabilité (art. 289 CGI)
 */
export async function createCreditNote(
  sourceInvoiceId: string,
  reason: string | null,
) {
  const supabase = await createClient();

  const { data: src, error: sErr } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", sourceInvoiceId)
    .maybeSingle();
  if (sErr || !src) {
    return { ok: false as const, error: sErr?.message ?? "Facture source introuvable" };
  }
  if (src.is_credit_note) {
    return { ok: false as const, error: "Un avoir ne peut pas être créé depuis un avoir." };
  }
  if (!["envoye", "paye", "en_retard"].includes(src.status)) {
    return {
      ok: false as const,
      error: "Un avoir n'est créable que sur une facture émise.",
    };
  }

  const { data: nbr, error: nbrErr } = await supabase.rpc("next_credit_note_number");
  if (nbrErr || !nbr) {
    return { ok: false as const, error: nbrErr?.message ?? "Numérotation impossible" };
  }

  const issueDate = new Date().toISOString().slice(0, 10);

  const { data: credit, error: cErr } = await supabase
    .from("invoices")
    .insert({
      number: nbr,
      quote_id: src.quote_id,
      client_id: src.client_id,
      status: "brouillon",
      issue_date: issueDate,
      due_date: null,
      event_date: src.event_date,
      event_end_date: src.event_end_date,
      subject: `Avoir sur facture ${src.number}`,
      terms: src.terms,
      tva_rate: src.tva_rate,
      total_ht: -src.total_ht,
      total_tva: -src.total_tva,
      total_ttc: -src.total_ttc,
      is_credit_note: true,
      source_invoice_id: src.id,
      credit_note_reason: reason,
      // IDOR protection: les avoirs sont aussi consultables en public
      // via /factures/[number] — mêmes besoins d'isolation.
      access_token: crypto.randomUUID(),
    })
    .select("id")
    .single();
  if (cErr || !credit) {
    return { ok: false as const, error: cErr?.message ?? "Création avoir échouée" };
  }

  // Copy items with negated quantities.
  const { data: items } = await supabase
    .from("invoice_items")
    .select("position,title,description,qty,unit,unit_price_ht")
    .eq("invoice_id", src.id)
    .order("position", { ascending: true });

  if (items && items.length > 0) {
    const { error: itemsErr } = await supabase.from("invoice_items").insert(
      items.map((it) => ({
        invoice_id: credit.id,
        position: it.position,
        title: it.title,
        description: it.description,
        qty: -(it.qty ?? 0),
        unit: it.unit,
        unit_price_ht: it.unit_price_ht,
      })),
    );
    if (itemsErr) return { ok: false as const, error: itemsErr.message };
  }

  revalidatePath(`/dashboard/factures/${sourceInvoiceId}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");

  return { ok: true as const, creditNoteId: credit.id };
}

/**
 * Envoi manuel d'une relance email sur une facture émise non payée.
 *  - N'accepte que les statuts `envoye` ou `en_retard` (pas d'avoir, pas de
 *    facture payée ou annulée — côté UI on masque le bouton, côté serveur
 *    on refuse par sécurité).
 *  - Ton commercial poli en FR, avec le solde restant s'il y a déjà des
 *    encaissements partiels (on déduit sum(invoice_payments.amount) du
 *    TTC pour afficher le montant vraiment dû).
 *  - Incrémente reminder_count et stamp last_reminded_at même si l'envoi
 *    Resend échoue, on renvoie quand même ok:true avec un warning — le
 *    propriétaire voit dans l'UI que l'email n'est pas parti et peut
 *    retenter / contacter le client autrement.
 */
export async function sendInvoiceReminder(id: string) {
  const supabase = await createClient();

  const { data: invoice, error: iErr } = await supabase
    .from("invoices")
    .select(
      "id,status,number,subject,client_id,due_date,total_ttc,is_credit_note,legal_snapshot,reminder_count,access_token",
    )
    .eq("id", id)
    .maybeSingle();
  if (iErr || !invoice) {
    return { ok: false as const, error: iErr?.message ?? "Facture introuvable" };
  }
  if (invoice.is_credit_note) {
    return { ok: false as const, error: "Un avoir ne se relance pas." };
  }
  if (invoice.status !== "envoye" && invoice.status !== "en_retard") {
    return {
      ok: false as const,
      error: `Relance impossible sur une facture ${invoice.status}.`,
    };
  }

  const [{ data: client }, { data: payments }] = await Promise.all([
    invoice.client_id
      ? supabase
          .from("clients")
          .select("first_name,last_name,company_name,email")
          .eq("id", invoice.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", id),
  ]);

  if (!client?.email) {
    return {
      ok: false as const,
      error: "Client sans email — ajoute une adresse dans la fiche client.",
    };
  }

  const paid = (payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const remaining =
    Math.round((Number(invoice.total_ttc ?? 0) - paid) * 100) / 100;
  if (remaining <= 0) {
    return {
      ok: false as const,
      error: "Facture déjà soldée — marque-la payée plutôt.",
    };
  }

  // Stamp the reminder first so we always track the attempt.
  const nowIso = new Date().toISOString();
  const { error: stampErr } = await supabase
    .from("invoices")
    .update({
      last_reminded_at: nowIso,
      reminder_count: (invoice.reminder_count ?? 0) + 1,
    })
    .eq("id", id);
  if (stampErr) return { ok: false as const, error: stampErr.message };

  revalidatePath(`/dashboard/factures/${id}`);
  revalidatePath("/dashboard/factures");

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "factures@cosmoclub.fr";
  if (!apiKey) {
    return {
      ok: true as const,
      emailed: false,
      warning: "RESEND_API_KEY non configurée — relance enregistrée mais non envoyée.",
    };
  }

  const legal =
    (invoice.legal_snapshot as { company_name?: string | null } | null) || null;
  const companyName = legal?.company_name || "Cosmo Club Paris";

  try {
    const resend = new Resend(apiKey);
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr";
    const link = invoice.access_token
      ? `${origin}/factures/${invoice.number}?t=${invoice.access_token}`
      : `${origin}/factures/${invoice.number}`;
    const firstName =
      (client as { first_name?: string | null }).first_name ?? "";
    const subjectLine =
      invoice.subject || `Facture ${invoice.number}`;
    const dueFormatted = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("fr-FR")
      : null;
    const nth = (invoice.reminder_count ?? 0) + 1; // already bumped locally for the email text

    await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: [client.email],
      subject:
        nth === 1
          ? `Rappel — ${subjectLine}`
          : `Relance (${nth}e) — ${subjectLine}`,
      html: buildReminderEmailHtml({
        firstName,
        subjectLine,
        number: invoice.number,
        dueFormatted,
        remainingEUR: formatEURInline(remaining),
        link,
        sender: companyName,
        nth,
      }),
    });
    return { ok: true as const, emailed: true };
  } catch (err) {
    console.error("[sendInvoiceReminder] resend error:", err);
    return {
      ok: true as const,
      emailed: false,
      warning:
        "Relance enregistrée mais email non envoyé (Resend a refusé). Réessaie ou contacte le client autrement.",
    };
  }
}

/* ─── Payments ──────────────────────────────────────────────────── */

export async function addPayment(
  invoiceId: string,
  input: {
    amount: number;
    paid_on: string; // YYYY-MM-DD
    method?: string | null;
    reference?: string | null;
    notes?: string | null;
  },
) {
  if (!Number.isFinite(input.amount) || input.amount === 0) {
    return { ok: false as const, error: "Le montant doit être différent de zéro." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount: input.amount,
    paid_on: input.paid_on,
    method: input.method?.trim() || null,
    reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/factures/${invoiceId}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function removePayment(paymentId: string, invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("invoice_payments").delete().eq("id", paymentId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/factures/${invoiceId}`);
  revalidatePath("/dashboard/factures");
  return { ok: true as const };
}

export async function deleteInvoice(id: string) {
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invoices")
    .select("id,status")
    .eq("id", id)
    .maybeSingle();
  if (!inv) return { ok: false as const, error: "Facture introuvable" };
  if (inv.status !== "brouillon") {
    return { ok: false as const, error: "Seuls les brouillons peuvent être supprimés" };
  }
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

/* ─── Email template ──────────────────────────────────────────────── */

function buildInvoiceEmailHtml(o: {
  firstName: string;
  subjectLine: string;
  number: string;
  dueLine: string;
  link: string;
  sender: string;
}): string {
  const greeting = o.firstName ? `Bonjour ${o.firstName},` : "Bonjour,";
  return `
<!doctype html>
<html><body style="font-family: Inter, system-ui, sans-serif; background:#f5efe0; margin:0; padding:32px; color:#2a1f14;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
    <tr>
      <td style="padding:32px 32px 8px;">
        <p style="font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#8b1a1a; margin:0 0 12px;">${escape(o.sender)}</p>
        <h1 style="font-family:Georgia,serif; font-size:28px; line-height:1.2; margin:0 0 18px; color:#2a1f14;">${escape(o.subjectLine)}</h1>
        <p style="margin:0 0 8px;">${escape(greeting)}</p>
        <p style="margin:0 0 6px;">Merci pour votre confiance. Voici la facture <strong>${escape(o.number)}</strong>.</p>
        <p style="margin:0 0 12px; font-size:13px; color:#3a2a1e;">${escape(o.dueLine)}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 32px;">
        <a href="${o.link}" style="display:inline-block; padding:14px 28px; background:#8b1a1a; color:#f5efe0; text-decoration:none; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;">
          Voir la facture
        </a>
        <p style="margin:24px 0 0; font-size:12px; color:#3a2a1e; opacity:0.7;">
          Ou copiez ce lien dans votre navigateur :<br/>
          <a href="${o.link}" style="color:#8b1a1a;">${o.link}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px; background:#f5efe0; font-size:11px; color:#3a2a1e; opacity:0.7;">
        Référence : ${escape(o.number)} · ${escape(o.sender)}
      </td>
    </tr>
  </table>
</body></html>`.trim();
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatEURInline(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function buildReminderEmailHtml(o: {
  firstName: string;
  subjectLine: string;
  number: string;
  dueFormatted: string | null;
  remainingEUR: string;
  link: string;
  sender: string;
  nth: number;
}): string {
  const greeting = o.firstName ? `Bonjour ${o.firstName},` : "Bonjour,";
  // Tone: cordial on #1, a touch firmer after that — still polite.
  const opener =
    o.nth === 1
      ? `Sauf erreur de notre part, notre facture <strong>${escape(
          o.number,
        )}</strong> n'a pas encore été réglée.`
      : `Nous nous permettons de revenir vers vous concernant notre facture <strong>${escape(
          o.number,
        )}</strong>, qui reste à ce jour impayée.`;
  const dueLine = o.dueFormatted
    ? `Échéance initiale&nbsp;: ${escape(o.dueFormatted)}.`
    : "";
  return `
<!doctype html>
<html><body style="font-family: Inter, system-ui, sans-serif; background:#f5efe0; margin:0; padding:32px; color:#2a1f14;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden;">
    <tr>
      <td style="padding:32px 32px 8px;">
        <p style="font-size:10px; letter-spacing:0.28em; text-transform:uppercase; color:#8b1a1a; margin:0 0 12px;">${escape(o.sender)}</p>
        <h1 style="font-family:Georgia,serif; font-size:24px; line-height:1.2; margin:0 0 18px; color:#2a1f14;">${escape(o.subjectLine)}</h1>
        <p style="margin:0 0 8px;">${escape(greeting)}</p>
        <p style="margin:0 0 8px;">${opener}</p>
        ${dueLine ? `<p style="margin:0 0 8px; font-size:13px; color:#3a2a1e;">${dueLine}</p>` : ""}
        <p style="margin:12px 0 6px; padding:12px 14px; background:#f5efe0; border-left:3px solid #8b1a1a; font-size:14px;">
          Montant restant dû&nbsp;: <strong>${escape(o.remainingEUR)}</strong>
        </p>
        <p style="margin:16px 0 8px; font-size:13px; color:#3a2a1e;">
          Merci de régulariser dès que possible. Si le règlement a croisé cet
          email, n'en tenez naturellement pas compte.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:8px 32px 32px;">
        <a href="${o.link}" style="display:inline-block; padding:14px 28px; background:#8b1a1a; color:#f5efe0; text-decoration:none; border-radius:999px; font-size:12px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;">
          Revoir la facture
        </a>
        <p style="margin:20px 0 0; font-size:12px; color:#3a2a1e; opacity:0.7;">
          Ou copiez ce lien dans votre navigateur&nbsp;:<br/>
          <a href="${o.link}" style="color:#8b1a1a;">${o.link}</a>
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px; background:#f5efe0; font-size:11px; color:#3a2a1e; opacity:0.7;">
        Référence&nbsp;: ${escape(o.number)} · ${escape(o.sender)} · relance ${o.nth}
      </td>
    </tr>
  </table>
</body></html>`.trim();
}
