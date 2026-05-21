import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR, formatEUR } from "@/lib/format";

export default async function DevisListPage() {
  const supabase = await createClient();
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id,number,status,issue_date,event_date,event_type,total_ttc,client_id")
    .order("created_at", { ascending: false })
    .limit(200);

  // Resolve clients in a second query so the types stay simple.
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

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
          Devis
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Plaquette PowerPoint-style + envoi email — éditeur dans le prochain sprint.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          Erreur de chargement : {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
        {quotes && quotes.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Numéro</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Type
                </th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Date événement
                </th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">
                  Total TTC
                </th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => {
                const client = q.client_id ? clientsMap.get(q.client_id) : null;
                const who =
                  client?.company_name ||
                  [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
                  client?.email ||
                  "—";
                return (
                  <tr
                    key={q.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
                  >
                    <td className="px-3 py-3 md:px-4">
                      <Link
                        href={`/dashboard/devis/${q.id}`}
                        className="font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-white dark:hover:text-[color:var(--color-grenat-glow)]"
                      >
                        {q.number}
                      </Link>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-500">
                        Émis {formatDateFR(q.issue_date)}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-700 dark:text-slate-700 dark:text-neutral-200 md:px-4">
                      {who}
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell md:px-4">
                      <EventTypeLabel value={q.event_type} />
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-slate-600 dark:text-neutral-300 md:table-cell md:px-4">
                      {formatDateFR(q.event_date)}
                    </td>
                    <td className="px-3 py-3 md:px-4">
                      <StatusBadge status={q.status} />
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-900 dark:text-slate-700 dark:text-neutral-200 md:px-4">
                      {formatEUR(q.total_ttc)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-500">
            Aucun devis. Convertis une{" "}
            <Link
              href="/dashboard/leads"
              className="text-slate-700 underline hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
            >
              demande
            </Link>{" "}
            en devis pour en créer un.
          </div>
        )}
      </div>
    </div>
  );
}
