"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { Database } from "@/types/database";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR, formatEUR } from "@/lib/format";

type QuoteStatus = Database["public"]["Enums"]["quote_status"];
type EventType = Database["public"]["Enums"]["event_type"];

export type QuoteRow = {
  id: string;
  number: string;
  status: QuoteStatus;
  issue_date: string;
  event_date: string | null;
  event_type: EventType | null;
  total_ht: number;
  total_ttc: number;
  client_id: string | null;
  /** The (non-credit-note) invoice spawned from this quote, if any. */
  invoice: { id: string; number: string; status: string } | null;
};

export type ClientLite = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
};

type EventSort = "none" | "asc" | "desc";

/**
 * Reading-order groups. A quote lands in exactly one:
 *  - attente   : sent, awaiting the client's answer
 *  - afacturer : signed, but no issued invoice yet (none, draft or cancelled)
 *  - brouillon : drafts
 *  - facture   : signed and invoiced (issued invoice exists)
 *  - refuse    : declined
 *  - expire    : expired
 */
type GroupKey =
  | "attente"
  | "afacturer"
  | "brouillon"
  | "facture"
  | "refuse"
  | "expire";

function groupOf(q: QuoteRow): GroupKey {
  switch (q.status) {
    case "brouillon":
      return "brouillon";
    case "refuse":
      return "refuse";
    case "expire":
      return "expire";
    case "accepte":
      return q.invoice &&
        q.invoice.status !== "brouillon" &&
        q.invoice.status !== "annule"
        ? "facture"
        : "afacturer";
    default:
      return "attente"; // envoye
  }
}

const GROUP_ORDER: GroupKey[] = [
  "attente",
  "afacturer",
  "brouillon",
  "facture",
  "refuse",
  "expire",
];

const GROUP_META: Record<
  GroupKey,
  { label: string; dot: string; defaultOpen: boolean }
> = {
  attente: {
    label: "En attente de réponse",
    dot: "bg-violet-500",
    defaultOpen: true,
  },
  afacturer: {
    label: "Signés · à facturer",
    dot: "bg-amber-500",
    defaultOpen: true,
  },
  brouillon: {
    label: "Brouillons",
    dot: "bg-slate-400",
    defaultOpen: true,
  },
  facture: {
    label: "Signés · facturés",
    dot: "bg-emerald-500",
    defaultOpen: false,
  },
  refuse: {
    label: "Refusés",
    dot: "bg-rose-500",
    defaultOpen: false,
  },
  expire: {
    label: "Expirés",
    dot: "bg-slate-500",
    defaultOpen: false,
  },
};

/**
 * Devis list with client-side search, a status chip filter, a grouped
 * reading view and a sortable event-date column. The server delivers up
 * to 200 quotes pre-loaded; everything below filters, groups and sorts
 * in memory so the UI feels instant.
 *
 * "Tous" renders the grouped view (awaiting answer, signed-to-invoice
 * and drafts open; invoiced/declined/expired collapsed); picking a chip
 * shows that group as a flat table. Mirrors FacturesBrowser.
 *
 * Sort cycle on the "Date événement" header: none → desc (farthest
 * first) → asc (closest first) → none. NULL event_date rows always
 * sink to the bottom so they don't pollute the visible sort.
 */
export function DevisBrowser({
  quotes,
  clients,
}: {
  quotes: QuoteRow[];
  clients: ClientLite[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GroupKey | "all">("all");
  const [eventSort, setEventSort] = useState<EventSort>("none");

  // Per-group collapse state — archive groups start folded so the page
  // stays readable as signed/declined quotes pile up.
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>(() => {
    const init = {} as Record<GroupKey, boolean>;
    for (const k of GROUP_ORDER) init[k] = GROUP_META[k].defaultOpen;
    return init;
  });

  const clientsMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  );

  function clientName(id: string | null): string {
    if (!id) return "—";
    const c = clientsMap.get(id);
    if (!c) return "—";
    return (
      c.company_name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.email ||
      "—"
    );
  }

  const normalized = query.trim().toLowerCase();

  const searched = useMemo(() => {
    let rows = quotes;

    // Search: number, client display name, status, event_type
    if (normalized) {
      rows = rows.filter((q) => {
        const who = clientName(q.client_id).toLowerCase();
        const hay = [
          q.number,
          who,
          q.status,
          q.event_type ?? "",
          q.invoice?.number ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(normalized);
      });
    }

    // Sort by event_date when active. Rows without an event date stay
    // grouped at the bottom regardless of direction (operator usually
    // wants to ignore them when sorting by event date). Groups preserve
    // this order because partitioning keeps relative order intact.
    if (eventSort !== "none") {
      rows = rows.slice().sort((a, b) => {
        if (!a.event_date && !b.event_date) return 0;
        if (!a.event_date) return 1;
        if (!b.event_date) return -1;
        const cmp = a.event_date.localeCompare(b.event_date);
        return eventSort === "asc" ? cmp : -cmp;
      });
    }

    return rows;
    // clientName depends on clientsMap; query+sort change retriggers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, normalized, eventSort, clientsMap]);

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, QuoteRow[]>();
    for (const k of GROUP_ORDER) map.set(k, []);
    for (const q of searched) map.get(groupOf(q))!.push(q);
    return map;
  }, [searched]);

  const visible =
    statusFilter === "all" ? searched : (grouped.get(statusFilter) ?? []);

  function cycleEventSort() {
    setEventSort((prev) =>
      prev === "none" ? "desc" : prev === "desc" ? "asc" : "none",
    );
  }

  const SortIcon =
    eventSort === "asc"
      ? ArrowUp
      : eventSort === "desc"
        ? ArrowDown
        : ArrowUpDown;

  const chips: Array<{ key: GroupKey | "all"; label: string; count: number }> = [
    { key: "all", label: "Tous", count: searched.length },
    ...GROUP_ORDER.map((k) => ({
      key: k,
      label: GROUP_META[k].label,
      count: (grouped.get(k) ?? []).length,
    })).filter((c) => c.count > 0),
  ];

  const tableProps = {
    clientName,
    eventSort,
    cycleEventSort,
    SortIcon,
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Numéro, client, statut, type d'événement…"
          className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:shadow-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Effacer
          </button>
        )}
      </div>

      {/* Status chips */}
      {quotes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = statusFilter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatusFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                }`}
              >
                {c.key !== "all" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${GROUP_META[c.key as GroupKey].dot}`}
                  />
                )}
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Counter */}
      <p className="text-[11px] text-slate-500 dark:text-slate-500">
        {visible.length} devis
        {visible.length !== quotes.length ? ` sur ${quotes.length}` : ""}
        {eventSort !== "none" && (
          <>
            {" · "}
            tri date événement {eventSort === "asc" ? "↑ croissant" : "↓ décroissant"}
            <button
              type="button"
              onClick={() => setEventSort("none")}
              className="ml-2 underline hover:text-slate-700 dark:hover:text-slate-300"
            >
              réinitialiser
            </button>
          </>
        )}
      </p>

      {statusFilter === "all" ? (
        /* Grouped reading view */
        <div className="space-y-4">
          {GROUP_ORDER.filter((k) => (grouped.get(k) ?? []).length > 0).map(
            (k) => {
              const groupRows = grouped.get(k)!;
              const meta = GROUP_META[k];
              const open = openGroups[k];
              const ht = groupRows.reduce(
                (s, q) => s + Number(q.total_ht ?? 0),
                0,
              );
              return (
                <section
                  key={k}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((s) => ({ ...s, [k]: !s[k] }))
                    }
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 md:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {meta.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {groupRows.length}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatEUR(ht)}
                        </span>{" "}
                        HT
                      </span>
                      {open ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 dark:border-slate-900">
                      <QuoteTable rows={groupRows} {...tableProps} />
                    </div>
                  )}
                </section>
              );
            },
          )}
          {searched.length === 0 && (
            <EmptyState normalized={normalized} query={query} />
          )}
        </div>
      ) : (
        /* Flat view for a single status chip */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          {visible.length > 0 ? (
            <QuoteTable rows={visible} {...tableProps} />
          ) : (
            <EmptyState normalized={normalized} query={query} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  normalized,
  query,
}: {
  normalized: string;
  query: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 dark:shadow-none">
      {normalized ? (
        <>
          Aucun devis ne correspond à{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            « {query} »
          </span>
          .
        </>
      ) : (
        <>Aucun devis.</>
      )}
    </div>
  );
}

function QuoteTable({
  rows,
  clientName,
  eventSort,
  cycleEventSort,
  SortIcon,
}: {
  rows: QuoteRow[];
  clientName: (id: string | null) => string;
  eventSort: EventSort;
  cycleEventSort: () => void;
  SortIcon: typeof ArrowUpDown;
}) {
  return (
    <div className="table-as-cards">
      {/* Accepted quotes carry an invoicing-control tag under their
          status (facturée / brouillon / à facturer). */}
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Numéro</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">
              Type
            </th>
            <th className="hidden px-4 py-3 font-medium md:table-cell">
              <button
                type="button"
                onClick={cycleEventSort}
                aria-label={
                  eventSort === "asc"
                    ? "Trié par date croissante — cliquer pour basculer décroissant"
                    : eventSort === "desc"
                      ? "Trié par date décroissante — cliquer pour basculer ordre original"
                      : "Cliquer pour trier par date événement"
                }
                className={
                  "inline-flex items-center gap-1 rounded transition-colors " +
                  (eventSort !== "none"
                    ? "text-slate-900 dark:text-white"
                    : "hover:text-slate-700 dark:hover:text-slate-300")
                }
              >
                Date événement
                <SortIcon className="h-3 w-3" />
              </button>
            </th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 text-right font-medium">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((q) => (
            <tr
              key={q.id}
              className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
            >
              <td data-label-hidden className="px-4 py-3">
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
              <td
                data-label="Client"
                className="px-4 py-3 text-slate-700 dark:text-slate-300"
              >
                {clientName(q.client_id)}
              </td>
              <td
                data-label="Type"
                className="hidden px-4 py-3 md:table-cell"
              >
                <EventTypeLabel value={q.event_type} />
              </td>
              <td
                data-label="Date événement"
                className="hidden px-4 py-3 text-xs text-slate-600 dark:text-slate-400 md:table-cell"
              >
                {q.event_date ? (
                  formatDateFR(q.event_date)
                ) : (
                  <span className="text-slate-400 dark:text-slate-600">—</span>
                )}
              </td>
              <td data-label="Statut" className="px-4 py-3">
                <StatusBadge status={q.status} />
                {q.status === "accepte" && (
                  <div className="mt-1.5">
                    <InvoiceTag invoice={q.invoice} />
                  </div>
                )}
              </td>
              <td
                data-label="Total HT"
                className="px-4 py-3 text-right font-medium tabular-nums text-slate-900 dark:text-slate-100"
              >
                {formatEUR(q.total_ht)}
                <p className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                  {formatEUR(q.total_ttc)} TTC
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Invoicing control for an accepted quote:
 *  - no invoice        → amber "À facturer" (the actionable alert)
 *  - draft invoice     → neutral "Facture en brouillon", links to it
 *  - cancelled invoice → red "Facture annulée", links to it
 *  - issued invoice    → emerald "Facturée · <number>", links to it
 */
function InvoiceTag({
  invoice,
}: {
  invoice: { id: string; number: string; status: string } | null;
}) {
  if (!invoice) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300">
        À facturer
      </span>
    );
  }
  const cls =
    invoice.status === "brouillon"
      ? "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300"
      : invoice.status === "annule"
        ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
        : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300";
  const label =
    invoice.status === "brouillon"
      ? "Facture en brouillon"
      : invoice.status === "annule"
        ? "Facture annulée"
        : `Facturée · ${invoice.number}`;
  return (
    <Link
      href={`/dashboard/factures/${invoice.id}`}
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80 ${cls}`}
      title={`Ouvrir la facture ${invoice.number}`}
    >
      {label}
    </Link>
  );
}
