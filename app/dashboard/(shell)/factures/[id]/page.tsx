import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ExternalLink, Mail, Phone, FileText } from "lucide-react";
import { InvoiceEditor } from "./InvoiceEditor";

type Params = Promise<{ id: string }>;

export default async function InvoiceDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: invoice }, { data: items }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", id)
      .order("position", { ascending: true }),
  ]);

  if (!invoice) {
    notFound();
  }

  const { data: client } = invoice.client_id
    ? await supabase.from("clients").select("*").eq("id", invoice.client_id).maybeSingle()
    : { data: null };

  return (
    <>
      <div className="border-b border-neutral-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/factures"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les factures
        </Link>
      </div>

      <InvoiceEditor invoice={invoice} items={items ?? []} />

      <div className="border-t border-neutral-900 px-4 py-6 md:px-8">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {client && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Client
              </p>
              <p className="text-sm font-medium text-white">
                {[client.first_name, client.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                  client.company_name ||
                  client.email ||
                  "—"}
              </p>
              {client.company_name &&
                (client.first_name || client.last_name) && (
                  <p className="text-xs text-neutral-400">{client.company_name}</p>
                )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
                  >
                    <Mail className="h-3 w-3" /> {client.email}
                  </a>
                )}
                {client.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
                  >
                    <Phone className="h-3 w-3" /> {client.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {invoice.quote_id && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                Devis source
              </p>
              <Link
                href={`/dashboard/devis/${invoice.quote_id}`}
                className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
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
