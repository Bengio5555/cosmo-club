import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, ExternalLink, Mail, Phone } from "lucide-react";
import { DevisEditor } from "./DevisEditor";

type Params = Promise<{ id: string }>;

export default async function DevisDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: items }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", id)
      .order("position", { ascending: true }),
  ]);

  if (!quote) {
    notFound();
  }

  const { data: client } = quote.client_id
    ? await supabase.from("clients").select("*").eq("id", quote.client_id).maybeSingle()
    : { data: null };

  return (
    <>
      <div className="border-b border-neutral-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/devis"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Tous les devis
        </Link>
      </div>

      <DevisEditor
        quote={quote}
        items={items ?? []}
        clientEmail={client?.email ?? null}
      />

      {client && (
        <div className="border-t border-neutral-900 px-4 py-6 md:px-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Client
          </p>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
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
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
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
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
              >
                Fiche <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
