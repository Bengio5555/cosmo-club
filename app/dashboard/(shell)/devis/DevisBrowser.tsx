"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
 * Devis list with client-side search + sortable event-date column.
 * The server delivers up to 200 quotes pre-loaded; everything below
 * filters and sorts in memory so the UI feels instant.
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
  const [eventSort, setEventSort] = useState<EventSort>("none");

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

  const visible = useMemo(() => {
    let rows = quotes;

    // Search: number, client display name, status, event_type
    if (normalized) {
      rows = rows.filter((q) => {
        const who = clientName(q.client_id).toLowerCase();
        const hay = [q.number, who, q.status, q.event_type ?? ""]
          .join(" ")
          .toLowerCase();
        return hay.includes(normalized);
      });
    }

    // Sort by event_date when active. Rows without an event date stay
    // grouped at the bottom regardless of direction (operator usually
    // wants to ignore them when sorting by event date).
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

      {/* Table card */}
      <div className="table-as-cards overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {visible.length > 0 ? (
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
              {visible.map((q) => (
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
        ) : (
          <div className="p-12 text-center text-sm text-slate-500 dark:text-slate-400">
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
        )}
      </div>
    </div>
  );
}
