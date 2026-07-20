import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getCompanyLogoDataUrl } from "@/lib/pdf/logo";
import type { InvoicePdfData } from "@/lib/pdf/InvoicePdf";

type LegalSnapshot = Partial<InvoicePdfData["legal"]>;

/**
 * Assemble everything InvoicePdf needs for one invoice. Shared by the
 * single-download route and the ZIP export so the two PDFs are
 * byte-for-byte identical. Legal data prefers the frozen
 * `legal_snapshot` captured at issuance (falls back to live settings
 * for drafts). Returns null when the invoice doesn't exist — RLS also
 * yields null for roles that can't read invoices, which the routes
 * surface as a 404.
 */
export async function fetchInvoicePdfData(
  supabase: SupabaseClient<Database>,
  invoiceId: string,
): Promise<{ data: InvoicePdfData; filename: string } | null> {
  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();
  if (!invoice) return null;

  const [{ data: items }, { data: settings }, { data: client }, { data: source }] =
    await Promise.all([
      supabase
        .from("invoice_items")
        .select("title,description,qty,unit,unit_price_ht,discount_ht,line_total_ht")
        .eq("invoice_id", invoice.id)
        .order("position", { ascending: true }),
      supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
      invoice.client_id
        ? supabase
            .from("clients")
            .select(
              "company_name,first_name,last_name,email,billing_address,postal_code,city,country,siret,tva_intracom",
            )
            .eq("id", invoice.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.is_credit_note && invoice.source_invoice_id
        ? supabase
            .from("invoices")
            .select("number,issue_date")
            .eq("id", invoice.source_invoice_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const snap =
    (invoice.legal_snapshot as LegalSnapshot | null) ||
    (settings as unknown as LegalSnapshot) ||
    {};
  const legal: InvoicePdfData["legal"] = {
    company_name: snap.company_name ?? null,
    legal_form: snap.legal_form ?? null,
    siret: snap.siret ?? null,
    tva_intracom: snap.tva_intracom ?? null,
    tva_franchise: !!snap.tva_franchise,
    address_line1: snap.address_line1 ?? null,
    address_line2: snap.address_line2 ?? null,
    postal_code: snap.postal_code ?? null,
    city: snap.city ?? null,
    country: snap.country ?? null,
    email: snap.email ?? null,
    phone: snap.phone ?? null,
    iban: snap.iban ?? null,
    bic: snap.bic ?? null,
    penalty_rate_text: snap.penalty_rate_text ?? null,
  };

  const clientName =
    client?.company_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.email ||
    "—";

  const data: InvoicePdfData = {
    invoice: {
      number: invoice.number,
      is_credit_note: invoice.is_credit_note,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      event_date: invoice.event_date,
      event_end_date: invoice.event_end_date ?? null,
      subject: invoice.subject,
      terms: invoice.terms,
      tva_rate: Number(invoice.tva_rate ?? 20),
      discount_global_pct: Number(invoice.discount_global_pct ?? 0),
      total_ht: Number(invoice.total_ht ?? 0),
      total_tva: Number(invoice.total_tva ?? 0),
      total_ttc: Number(invoice.total_ttc ?? 0),
      paid_at: invoice.paid_at,
      credit_note_reason: invoice.credit_note_reason ?? null,
    },
    items: (items ?? []).map((it) => ({
      title: it.title,
      description: it.description,
      qty: Number(it.qty ?? 0),
      unit: it.unit,
      unit_price_ht: Number(it.unit_price_ht ?? 0),
      discount_ht: Number(it.discount_ht ?? 0),
      line_total_ht: Number(it.line_total_ht ?? 0),
    })),
    client: client
      ? {
          name: clientName,
          billing_address: client.billing_address,
          postal_code: client.postal_code,
          city: client.city,
          country: client.country,
          siret: client.siret,
          tva_intracom: client.tva_intracom,
          email: client.email,
        }
      : null,
    legal,
    sourceInvoice: source ?? null,
    logoDataUrl: await getCompanyLogoDataUrl(),
  };

  const safeClient = clientName
    .replace(/[^\w\sÀ-ÿ.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 50);
  const filename = `${invoice.number}${safeClient && safeClient !== "—" ? `_${safeClient}` : ""}.pdf`;

  return { data, filename };
}
