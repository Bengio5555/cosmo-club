import Link from "next/link";
import { Search, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR, formatEUR } from "@/lib/format";
import { NewClientButton } from "./NewClientButton";

type SP = Promise<{ q?: string; archived?: string }>;

export default async function ClientsListPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { q, archived } = await searchParams;
  const query = (q ?? "").trim();
  const showArchived = archived === "1";
  const supabase = await createClient();

  // Base query — optional search by name/company/email.
  // Archived clients are hidden by default; surface them when ?archived=1.
  let builder = supabase
    .from("clients")
    .select(
      "id,first_name,last_name,company_name,email,phone,city,created_at,updated_at,archived",
    )
    .eq("archived", showArchived)
    .order("updated_at", { ascending: false })
    .limit(300);

  if (query) {
    const like = `%${query}%`;
    builder = builder.or(
      `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like}`,
    );
  }

  const { data: clients, error } = await builder;

  // Count archived to surface a "Voir archivés (N)" link.
  const { count: archivedCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true })
    .eq("archived", true);

  // Pull ALL issued invoices in one query and aggregate in JS. Cheap for
  // the <1k rows we'll have; saves a Postgres GROUP BY roundtrip per
  // page load. Credit notes already have negative totals so the sum is
  // naturally net of avoirs.
  const clientIds = (clients ?? []).map((c) => c.id);
  const [{ data: invoices }, { data: quotes }] = await Promise.all([
    clientIds.length
      ? supabase
          .from("invoices")
          .select("client_id,total_ttc,status")
          .in("client_id", clientIds)
          .neq("status", "brouillon")
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? supabase
          .from("quotes")
          .select("client_id,status")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [] }),
  ]);

  const caByClient = new Map<string, number>();
  const invoicesByClient = new Map<string, number>();
  for (const inv of invoices ?? []) {
    if (!inv.client_id) continue;
    if (inv.status !== "annule") {
      caByClient.set(
        inv.client_id,
        (caByClient.get(inv.client_id) ?? 0) + Number(inv.total_ttc ?? 0),
      );
    }
    invoicesByClient.set(
      inv.client_id,
      (invoicesByClient.get(inv.client_id) ?? 0) + 1,
    );
  }

  const quotesByClient = new Map<string, number>();
  for (const qt of quotes ?? []) {
    if (!qt.client_id) continue;
    quotesByClient.set(
      qt.client_id,
      (quotesByClient.get(qt.client_id) ?? 0) + 1,
    );
  }

  // Sort: when no search, prefer highest-CA clients first.
  const sortedClients = (clients ?? []).slice();
  if (!query) {
    sortedClients.sort((a, b) => {
      const caA = caByClient.get(a.id) ?? 0;
      const caB = caByClient.get(b.id) ?? 0;
      if (caB !== caA) return caB - caA;
      return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
    });
  }

  const totalCA = Array.from(caByClient.values()).reduce((s, v) => s + v, 0);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Annuaire consolidé · CA cumulé, historique devis et factures en un
            coup d&apos;œil.
          </p>
        </div>
        <NewClientButton />
      </header>

      <form
        method="GET"
        className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-2.5"
      >
        <Search className="ml-1 h-3.5 w-3.5 text-slate-400 dark:text-neutral-500" />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Rechercher par nom, société, email…"
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-neutral-600"
        />
        {showArchived && <input type="hidden" name="archived" value="1" />}
        {query && (
          <Link
            href={showArchived ? "/dashboard/clients?archived=1" : "/dashboard/clients"}
            className="rounded-md border border-transparent px-2 py-1 text-[11px] text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white"
          >
            Effacer
          </Link>
        )}
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-700 dark:hover:text-white dark:shadow-none"
        >
          Filtrer
        </button>
      </form>

      <div className="mb-4 flex items-center gap-3 text-[11px] text-slate-500 dark:text-neutral-500">
        {showArchived ? (
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-700 shadow-sm hover:border-slate-400 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600 dark:shadow-none"
          >
            ← Voir les clients actifs
          </Link>
        ) : (
          (archivedCount ?? 0) > 0 && (
            <Link
              href="/dashboard/clients?archived=1"
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-slate-500 shadow-sm hover:border-slate-400 hover:text-slate-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-600 dark:hover:text-neutral-200 dark:shadow-none"
            >
              Voir les archivés · {archivedCount}
            </Link>
          )
        )}
      </div>

      {(sortedClients.length > 0 || query) && (
        <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-3 text-center">
          <Stat label="Clients" value={String(sortedClients.length)} />
          <Stat label="Total devis" value={String(quotes?.length ?? 0)} />
          <Stat label="CA cumulé" value={formatEUR(totalCA)} tone="ok" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
        {sortedClients.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Contact
                </th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Ville
                </th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Devis</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">
                  Factures
                </th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">
                  CA cumulé
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedClients.map((c) => {
                const ca = caByClient.get(c.id) ?? 0;
                const nbInvoices = invoicesByClient.get(c.id) ?? 0;
                const nbQuotes = quotesByClient.get(c.id) ?? 0;
                const displayName =
                  c.company_name ||
                  [c.first_name, c.last_name].filter(Boolean).join(" ") ||
                  c.email ||
                  "—";
                const isB2B = !!c.company_name;
                return (
                  <tr
                    key={c.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-neutral-900 dark:hover:bg-neutral-900"
                  >
                    <td className="px-3 py-3 md:px-4">
                      <Link
                        href={`/dashboard/clients/${c.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-semibold text-white">
                          {(displayName
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0]?.toUpperCase() ?? "")
                            .join("") || "?")}
                        </div>
                        <div className="min-w-0">
                          <p className="inline-flex items-center gap-2 font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-white dark:hover:text-[color:var(--color-grenat-glow)]">
                            <span className="truncate">{displayName}</span>
                            {isB2B && (
                              <span className="rounded-full border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
                                B2B
                              </span>
                            )}
                          </p>
                          {isB2B && (c.first_name || c.last_name) && (
                            <p className="truncate text-[11px] text-slate-500 dark:text-neutral-500">
                              {[c.first_name, c.last_name]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                          )}
                          <p className="truncate text-[11px] text-slate-500 dark:text-neutral-500 md:hidden">
                            {c.email ?? c.phone ?? "—"}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-slate-600 dark:text-neutral-300 md:table-cell md:px-4">
                      {c.email && <div>{c.email}</div>}
                      {c.phone && (
                        <div className="text-slate-500 dark:text-neutral-500">{c.phone}</div>
                      )}
                    </td>
                    <td className="hidden px-3 py-3 text-xs text-slate-500 dark:text-neutral-400 md:table-cell md:px-4">
                      {c.city ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 dark:text-neutral-300 md:px-4">
                      {nbQuotes || <span className="text-slate-400 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-700 dark:text-neutral-300 md:px-4">
                      {nbInvoices || <span className="text-slate-400 dark:text-neutral-600">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-medium text-slate-900 dark:text-neutral-100 md:px-4">
                      {ca > 0 ? formatEUR(ca) : <span className="text-slate-400 dark:text-neutral-600">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : query ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-500">
            Aucun client ne correspond à <span className="font-medium text-slate-700 dark:text-neutral-300">“{query}”</span>.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-500 dark:text-neutral-500">
            <Users className="h-6 w-6 text-slate-400 dark:text-neutral-700" />
            <p>Aucun client pour l&apos;instant.</p>
            <p className="text-xs text-slate-500 dark:text-neutral-600">
              Ils apparaissent ici automatiquement quand tu convertis une{" "}
              <Link
                href="/dashboard/leads"
                className="text-slate-700 underline hover:text-slate-900 dark:text-neutral-300 dark:hover:text-white"
              >
                demande
              </Link>
              , ou utilise « Nouveau client » pour en ajouter un à la main.
            </p>
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-slate-500 dark:text-neutral-600">
        {formatDateFR(new Date())} · CA cumulé net des avoirs, factures annulées
        exclues.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "pending";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
      ? "text-amber-700 dark:text-amber-300"
      : "text-slate-900 dark:text-neutral-100";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
