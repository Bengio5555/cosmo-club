import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR, formatEUR } from "@/lib/format";

export default async function DevisListPage() {
  const supabase = await createClient();
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select(
      "id,number,status,issue_date,event_date,event_type,total_ttc,client_id",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const clientIds = Array.from(
    new Set((quotes ?? []).map((q) => q.client_id).filter((x): x is string => !!x)),
  );
  const { data: clientsList } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email")
        .in("id", clientIds)
    : { data: [] };
  const clientsMap = new Map((clientsList ?? []).map((c) => [c.id, c]));

  // Aggregates for the small stats row. The "Signés" pill shows both
  // the count AND the cumulative TTC of accepted quotes — used to be
  // computed across ALL statuses, which inflated the value by mixing
  // in drafts + sent + refused. Restricting to status === "accepte"
  // matches the count and what the label promises.
  const signedQuotes = (quotes ?? []).filter((q) => q.status === "accepte");
  const signedTotalTtc = signedQuotes.reduce(
    (s, q) => s + Number(q.total_ttc ?? 0),
    0,
  );
  const signedCount = signedQuotes.length;
  const pendingCount = (quotes ?? []).filter((q) => q.status === "envoye").length;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pilotage · Devis
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Devis
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Plaquette éditoriale + envoi email Resend. Workflow brouillon →
              envoyé → accepté → facture.
            </p>
          </div>
          <Link
            href="/dashboard/leads"
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Convertir une demande
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Stats strip */}
        {(quotes?.length ?? 0) > 0 && (
          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatPill label="Total devis" value={String(quotes?.length)} />
            <StatPill
              label="En attente"
              value={String(pendingCount)}
              tone="amber"
            />
            <StatPill
              label="Signés"
              value={`${signedCount} · ${formatEUR(signedTotalTtc)}`}
              tone="emerald"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            Erreur de chargement : {error.message}
          </div>
        )}

        {/* Table card */}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {quotes && quotes.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Type
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">
                    Date événement
                  </th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-right font-medium">Total TTC</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const client = q.client_id ? clientsMap.get(q.client_id) : null;
                  const who =
                    client?.company_name ||
                    [client?.first_name, client?.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    client?.email ||
                    "—";
                  return (
                    <tr
                      key={q.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/devis/${q.id}`}
                          className="font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-slate-100 dark:hover:text-[color:var(--color-grenat-glow)]"
                        >
                          {q.number}
                        </Link>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Émis {formatDateFR(q.issue_date)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {who}
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <EventTypeLabel value={q.event_type} />
                      </td>
                      <td className="hidden px-4 py-3 text-xs text-slate-600 dark:text-slate-400 md:table-cell">
                        {formatDateFR(q.event_date)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100">
                        {formatEUR(q.total_ttc)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
              Aucun devis. Convertis une{" "}
              <Link
                href="/dashboard/leads"
                className="font-medium text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
              >
                demande
              </Link>{" "}
              pour en créer un.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  const valueCls =
    tone === "emerald"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1.5 text-lg font-semibold tabular-nums ${valueCls}`}>
        {value}
      </p>
    </div>
  );
}
