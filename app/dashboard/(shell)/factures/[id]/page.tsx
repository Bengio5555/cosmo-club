import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ExternalLink, Mail, Phone, FileText } from "lucide-react";
import { InvoiceEditor } from "./InvoiceEditor";
import { PaymentsSection } from "./PaymentsSection";

type Params = Promise<{ id: string }>;

export default async function InvoiceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }, { data: payments }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("paid_on", { ascending: false }),
  ]);

  if (!invoice) {
    notFound();
  }

  const [{ data: client }, { data: sourceInvoice }, { data: creditNotes }] =
    await Promise.all([
      invoice.client_id
        ? supabase.from("clients").select("*").eq("id", invoice.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
      invoice.source_invoice_id
        ? supabase
            .from("invoices")
            .select("id,number")
            .eq("id", invoice.source_invoice_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      !invoice.is_credit_note
        ? supabase
            .from("invoices")
            .select("id,number,status,total_ttc")
            .eq("source_invoice_id", invoice.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  // Options for the "Devis source" link selector: accepted quotes (plus
  // whatever is currently linked, whatever its status), flagged when
  // already claimed by another invoice. Lets the operator attach a
  // direct invoice (e.g. billed to the client's holding) to its quote.
  let quoteOptions: Array<{ id: string; label: string; taken: boolean }> = [];
  if (!invoice.is_credit_note) {
    const [{ data: quotesList }, { data: linkedInvoices }] = await Promise.all([
      supabase
        .from("quotes")
        .select("id,number,status,client_id")
        .or(
          invoice.quote_id
            ? `status.eq.accepte,id.eq.${invoice.quote_id}`
            : "status.eq.accepte",
        )
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("invoices")
        .select("id,quote_id")
        .eq("is_credit_note", false)
        .not("quote_id", "is", null),
    ]);
    const takenByOther = new Set(
      (linkedInvoices ?? [])
        .filter((i) => i.id !== invoice.id && i.quote_id)
        .map((i) => i.quote_id as string),
    );
    const qClientIds = Array.from(
      new Set(
        (quotesList ?? [])
          .map((q) => q.client_id)
          .filter((x): x is string => !!x),
      ),
    );
    const { data: qClients } = qClientIds.length
      ? await supabase
          .from("clients")
          .select("id,first_name,last_name,company_name,email")
          .in("id", qClientIds)
      : { data: [] };
    const qClientName = new Map(
      (qClients ?? []).map((c) => [
        c.id,
        c.company_name ||
          [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          c.email ||
          "—",
      ]),
    );
    quoteOptions = (quotesList ?? []).map((q) => ({
      id: q.id,
      label: `${q.number} · ${q.client_id ? (qClientName.get(q.client_id) ?? "—") : "—"}`,
      taken: takenByOther.has(q.id),
    }));
  }

  return (
    <>
      <div className="border-b border-slate-100 dark:border-slate-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/factures"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les factures
        </Link>
      </div>

      <InvoiceEditor
        invoice={invoice}
        items={items ?? []}
        sourceInvoice={sourceInvoice ?? null}
        creditNotes={creditNotes ?? []}
        quoteOptions={quoteOptions}
      />

      {!invoice.is_credit_note &&
        (invoice.status === "envoye" ||
          invoice.status === "en_retard" ||
          invoice.status === "paye") && (
          <div className="px-4 pb-6 md:px-8">
            <PaymentsSection
              invoiceId={invoice.id}
              invoiceStatus={invoice.status}
              totalTtc={Number(invoice.total_ttc)}
              payments={payments ?? []}
            />
          </div>
        )}

      <div className="border-t border-slate-100 dark:border-slate-900 px-4 py-6 md:px-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {client && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Client
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {[client.first_name, client.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                  client.company_name ||
                  client.email ||
                  "—"}
              </p>
              {client.company_name &&
                (client.first_name || client.last_name) && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">{client.company_name}</p>
                )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Mail className="h-3 w-3" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Phone className="h-3 w-3" /> {client.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {invoice.quote_id && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Devis source
              </p>
              <Link
                href={`/dashboard/devis/${invoice.quote_id}`}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
              >
                <FileText className="h-3.5 w-3.5" />
                Voir le devis original
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
