import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR, formatEUR } from "@/lib/format";
import { ArrowLeft, Construction } from "lucide-react";

type Params = Promise<{ id: string }>;

export default async function DevisDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: quote }, { data: client }, { data: items }] = await Promise.all([
    supabase.from("quotes").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("quotes")
      .select("client:clients(*)")
      .eq("id", id)
      .maybeSingle()
      .then((r) => ({ data: r.data?.client ?? null })),
    supabase
      .from("quote_items")
      .select("*")
      .eq("quote_id", id)
      .order("position", { ascending: true }),
  ]);

  if (!quote) {
    notFound();
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <Link
        href="/dashboard/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour
      </Link>

      <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <StatusBadge status={quote.status} />
            <span className="text-[11px] text-neutral-500">
              Émis le {formatDateFR(quote.issue_date)}
            </span>
          </div>
          <h1 className="font-display text-3xl text-white md:text-4xl">
            {quote.number}
          </h1>
          {quote.subject && (
            <p className="mt-1 text-sm text-neutral-400">{quote.subject}</p>
          )}
        </div>
      </header>

      <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-200 md:p-5">
        <div className="flex items-start gap-3">
          <Construction className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Éditeur de devis — prochaine étape</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              Le brouillon a été créé (numéro réservé, client associé). L&apos;interface
              d&apos;édition par sections et la génération de plaquette HTML arrivent
              dans la prochaine session.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,280px)]">
        <section className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Détails
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-xs text-neutral-500">Type d&apos;événement</dt>
              <dd className="text-right">
                <EventTypeLabel value={quote.event_type} />
              </dd>

              <dt className="text-xs text-neutral-500">Date événement</dt>
              <dd className="text-right text-neutral-200">{formatDateFR(quote.event_date)}</dd>

              <dt className="text-xs text-neutral-500">Invités</dt>
              <dd className="text-right text-neutral-200">
                {quote.guests_count ?? "—"}
              </dd>

              <dt className="text-xs text-neutral-500">Lieu</dt>
              <dd className="text-right text-neutral-200">
                {quote.event_location || "—"}
              </dd>

              <dt className="text-xs text-neutral-500">Valable jusqu&apos;au</dt>
              <dd className="text-right text-neutral-200">
                {formatDateFR(quote.valid_until)}
              </dd>
            </dl>
          </div>

          {items && items.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
              <table className="w-full text-sm">
                <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Prestation</th>
                    <th className="px-3 py-2 text-right font-medium">Qté</th>
                    <th className="px-3 py-2 text-right font-medium">PU HT</th>
                    <th className="px-3 py-2 text-right font-medium">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} className="border-t border-neutral-900">
                      <td className="px-3 py-2 text-neutral-200">{it.title}</td>
                      <td className="px-3 py-2 text-right text-neutral-400">{it.qty}</td>
                      <td className="px-3 py-2 text-right text-neutral-400">{formatEUR(it.unit_price_ht)}</td>
                      <td className="px-3 py-2 text-right text-neutral-200">{formatEUR(it.line_total_ht ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Client
            </p>
            {client ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-white">
                  {[client.first_name, client.last_name].filter(Boolean).join(" ") ||
                    client.company_name ||
                    "—"}
                </p>
                {client.company_name &&
                  (client.first_name || client.last_name) && (
                    <p className="text-xs text-neutral-400">{client.company_name}</p>
                  )}
                {client.email && (
                  <p className="text-xs text-neutral-400">{client.email}</p>
                )}
                {client.phone && (
                  <p className="text-xs text-neutral-400">{client.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Aucun client associé.</p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Totaux
            </p>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Total HT</dt>
                <dd className="text-neutral-200">{formatEUR(quote.total_ht)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500">TVA ({quote.tva_rate}%)</dt>
                <dd className="text-neutral-200">{formatEUR(quote.total_tva)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-1.5 text-base font-semibold">
                <dt className="text-neutral-300">Total TTC</dt>
                <dd className="text-white">{formatEUR(quote.total_ttc)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
