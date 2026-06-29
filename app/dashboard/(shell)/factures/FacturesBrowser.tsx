"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Database } from "@/types/database";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDateFR, formatEUR } from "@/lib/format";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  total_ttc: number;
  is_credit_note: boolean;
  /** Resolved client display name (server-side). */
  who: string;
  /** Sum of payments recorded against this invoice. */
  paid: number;
  /** Sum of credit notes (avoirs) offsetting this invoice. */
  credited: number;
};

/** Amount still owed: total minus payments minus credit notes, floored at 0. */
function remainingOf(r: InvoiceRow): number {
  if (r.is_credit_note) return 0;
  return Math.round((Number(r.total_ttc) - r.paid - r.credited) * 100) / 100;
}

/**
 * Invoice list with instant client-side search (number + client name).
 * The server delivers the rows already filtered by the date/type form;
 * this narrows them in memory and keeps the totals bar in sync with
 * whatever is currently visible. Mirrors DevisBrowser.
 */
export function FacturesBrowser({
  rows,
  hasServerFilter,
}: {
  rows: InvoiceRow[];
  hasServerFilter: boolean;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const visible = useMemo(() => {
    if (!normalized) return rows;
    return rows.filter((r) =>
      `${r.number} ${r.who}`.toLowerCase().includes(normalized),
    );
  }, [rows, normalized]);

  // Totals recompute over the visible set so the bar always matches the
  // list (date/type filter + live search).
  const totals = useMemo(() => {
    let ttc = 0;
    let paid = 0;
    let remaining = 0;
    for (const r of visible) {
      ttc += Number(r.total_ttc ?? 0);
      if (!r.is_credit_note) {
        paid += r.paid;
        if (r.status !== "annule") {
          remaining += Math.max(0, remainingOf(r));
        }
      }
    }
    return { ttc, paid, remaining };
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Numéro de facture ou client…"
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

      {/* Totals bar (over the visible set) */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-3 text-center">
          <Stat label={`Total TTC (${visible.length})`} value={formatEUR(totals.ttc)} />
          <Stat label="Encaissé" value={formatEUR(totals.paid)} tone="ok" />
          <Stat label="Reste à encaisser" value={formatEUR(totals.remaining)} tone="pending" />
        </div>
      )}

      {/* Table card */}
      <div className="table-as-cards overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {visible.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Numéro</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Émise</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Échéance</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Total TTC</th>
                <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell md:px-4">
                  Reste
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((inv) => {
                const remaining = remainingOf(inv);
                // A fully-credited invoice is settled — don't flag it overdue.
                const overdue =
                  !inv.is_credit_note &&
                  inv.status === "envoye" &&
                  !!inv.due_date &&
                  inv.due_date < today &&
                  remaining > 0;
                return (
                  <tr
                    key={inv.id}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                  >
                    <td data-label-hidden className="px-3 py-3 md:px-4">
                      <Link
                        href={`/dashboard/factures/${inv.id}`}
                        className="inline-flex items-center gap-2 font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-white dark:hover:text-[color:var(--color-grenat-glow)]"
                      >
                        {inv.number}
                        {inv.is_credit_note && (
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200">
                            Avoir
                          </span>
                        )}
                      </Link>
                    </td>
                    <td data-label="Client" className="px-3 py-3 text-slate-700 dark:text-slate-200 md:px-4">
                      {inv.who}
                    </td>
                    <td data-label="Émise" className="hidden px-3 py-3 text-xs text-slate-500 dark:text-slate-400 md:table-cell md:px-4">
                      {formatDateFR(inv.issue_date)}
                    </td>
                    <td data-label="Échéance" className="hidden px-3 py-3 text-xs md:table-cell md:px-4">
                      {inv.due_date ? (
                        <span className={overdue ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}>
                          {formatDateFR(inv.due_date)}
                          {overdue && <span className="ml-1 text-red-600 dark:text-red-400">(en retard)</span>}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )}
                    </td>
                    <td data-label="Statut" className="px-3 py-3 md:px-4">
                      <StatusBadge
                        status={overdue && inv.status === "envoye" ? "en_retard" : inv.status}
                      />
                    </td>
                    <td
                      data-label="Total TTC"
                      className={`px-3 py-3 text-right font-medium md:px-4 ${
                        inv.is_credit_note
                          ? "text-violet-700 dark:text-violet-200"
                          : "text-slate-900 dark:text-slate-200"
                      }`}
                    >
                      {formatEUR(Number(inv.total_ttc))}
                    </td>
                    <td data-label="Reste" className="hidden px-3 py-3 text-right md:table-cell md:px-4">
                      {inv.is_credit_note ? (
                        <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                      ) : remaining <= 0 ? (
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                          {inv.credited > 0 && inv.paid <= 0 ? "Soldé (avoir)" : "Soldé"}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium ${
                            overdue
                              ? "text-red-600 dark:text-red-300"
                              : "text-amber-700 dark:text-amber-300"
                          }`}
                        >
                          {formatEUR(remaining)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-500">
            {normalized ? (
              <>
                Aucune facture ne correspond à{" "}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  « {query} »
                </span>
                .
              </>
            ) : (
              <>
                Aucune facture{hasServerFilter ? " sur ce filtre" : ""}. Depuis un{" "}
                <Link
                  href="/dashboard/devis"
                  className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  devis accepté
                </Link>
                , clique « Créer la facture » pour en générer une.
              </>
            )}
          </div>
        )}
      </div>
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
        : "text-slate-900 dark:text-slate-100";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
