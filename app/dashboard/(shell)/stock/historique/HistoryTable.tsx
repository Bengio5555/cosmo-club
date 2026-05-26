"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Search,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { formatDateFR } from "@/lib/format";

export type HistoryRow = {
  id: string;
  created_at: string;
  direction: "in" | "out";
  qty: number;
  reason: string | null;
  productId: string;
  productName: string;
  productUnit: string | null;
  productCategory: string | null;
  eventId: string | null;
  eventTitle: string | null;
  eventDate: string | null;
};

type Counts = { total: number; in: number; out: number };

type Initial = {
  from?: string;
  to?: string;
  product?: string;
  direction?: string;
  source?: string;
};

const DIRECTION_TABS: { value: "all" | "in" | "out"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "in", label: "Entrées" },
  { value: "out", label: "Sorties" },
];

const SOURCE_TABS: { value: "all" | "manual" | "event"; label: string }[] = [
  { value: "all", label: "Toutes sources" },
  { value: "manual", label: "Ajustement manuel" },
  { value: "event", label: "Clôture événement" },
];

/**
 * Stock variation log — client-side filter on a pre-loaded payload.
 * Server delivers up to 1000 rows already filtered by date/direction/
 * source; the search box runs ILIKE-equivalent in memory so typing
 * feels instant. Date and tab filters round-trip to the server via
 * URL params so each filtered view is bookmarkable.
 */
export function HistoryTable({
  rows,
  counts,
  initial,
}: {
  rows: HistoryRow[];
  counts: Counts;
  initial: Initial;
}) {
  const [search, setSearch] = useState(initial.product ?? "");
  const direction = (initial.direction as "in" | "out" | undefined) ?? "all";
  const source = (initial.source as "manual" | "event" | undefined) ?? "all";

  const normalized = search.trim().toLowerCase();

  const visible = useMemo(() => {
    if (!normalized) return rows;
    return rows.filter((r) => {
      const hay = [
        r.productName,
        r.productCategory ?? "",
        r.reason ?? "",
        r.eventTitle ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(normalized);
    });
  }, [rows, normalized]);

  // Sum of in / out / net for the currently visible (post-search) rows
  const stats = useMemo(() => {
    let inSum = 0;
    let outSum = 0;
    for (const r of visible) {
      if (r.direction === "in") inSum += r.qty;
      else outSum += r.qty;
    }
    return {
      in: inSum,
      out: outSum,
      net: inSum - outSum,
    };
  }, [visible]);

  function buildHref(patch: Partial<Initial>): string {
    const params = new URLSearchParams();
    const next = { ...initial, ...patch };
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.direction && next.direction !== "all")
      params.set("direction", next.direction);
    if (next.source && next.source !== "all") params.set("source", next.source);
    const qs = params.toString();
    return `/dashboard/stock/historique${qs ? `?${qs}` : ""}`;
  }

  function exportCsv() {
    const headers = [
      "Date",
      "Sens",
      "Quantité",
      "Unité",
      "Produit",
      "Catégorie",
      "Motif",
      "Événement",
    ];
    const lines = visible.map((r) =>
      [
        new Date(r.created_at).toISOString(),
        r.direction === "in" ? "Entrée" : "Sortie",
        r.qty,
        r.productUnit ?? "",
        r.productName,
        r.productCategory ?? "",
        (r.reason ?? "").replace(/[\r\n]+/g, " "),
        r.eventTitle ?? "",
      ]
        .map((v) => {
          const s = String(v);
          // CSV-escape: wrap in quotes if it contains "," ";" or quote
          if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
          return s;
        })
        .join(";"),
    );
    const csv = [headers.join(";"), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-variations-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Total mouvements"
          value={String(counts.total)}
          hint={`${visible.length} visibles`}
        />
        <Stat
          label="Entrées"
          value={`+${stats.in}`}
          hint={`${counts.in} mouvements`}
          tone="ok"
        />
        <Stat
          label="Sorties"
          value={`−${stats.out}`}
          hint={`${counts.out} mouvements`}
          tone="err"
        />
        <Stat
          label="Net"
          value={(stats.net >= 0 ? "+" : "") + stats.net.toString()}
          tone={stats.net >= 0 ? "ok" : "warn"}
        />
      </div>

      {/* Direction tabs + date pickers */}
      <form
        method="GET"
        action="/dashboard/stock/historique"
        className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:grid-cols-[auto_minmax(0,160px)_minmax(0,160px)_auto_auto]"
      >
        <div className="flex flex-wrap gap-1">
          {DIRECTION_TABS.map((t) => {
            const isActive = direction === t.value;
            return (
              <Link
                key={t.value}
                href={buildHref({ direction: t.value })}
                className={
                  "inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Du
          </span>
          <input
            type="date"
            name="from"
            defaultValue={initial.from ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Au
          </span>
          <input
            type="date"
            name="to"
            defaultValue={initial.to ?? ""}
            className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none"
          />
        </label>
        {/* preserve direction + source through the date submit */}
        {initial.direction && initial.direction !== "all" && (
          <input type="hidden" name="direction" value={initial.direction} />
        )}
        {initial.source && initial.source !== "all" && (
          <input type="hidden" name="source" value={initial.source} />
        )}
        <button
          type="submit"
          className="self-end rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
        >
          <Calendar className="mr-1 inline h-3.5 w-3.5" />
          Filtrer
        </button>
        {(initial.from ||
          initial.to ||
          initial.direction ||
          initial.source) && (
          <Link
            href="/dashboard/stock/historique"
            className="self-end rounded-md border border-transparent px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Source tabs + search + export */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          {SOURCE_TABS.map((t) => {
            const isActive = source === t.value;
            return (
              <Link
                key={t.value}
                href={buildHref({ source: t.value })}
                className={
                  "inline-flex items-center rounded-md px-3 py-1 text-xs font-medium transition-colors " +
                  (isActive
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
        <div className="flex flex-1 items-center gap-2 md:max-w-md md:justify-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Produit, catégorie, motif, événement…"
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:text-slate-900 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-as-cards overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {visible.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Date</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Sens</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">
                  Qté
                </th>
                <th className="px-3 py-2.5 font-medium md:px-4">Produit</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Motif
                </th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Source
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-slate-100 dark:border-slate-900"
                >
                  <td
                    data-label="Date"
                    className="px-3 py-3 text-xs text-slate-600 dark:text-slate-400 md:px-4"
                  >
                    {formatDateFR(r.created_at, { withTime: true })}
                  </td>
                  <td data-label="Sens" className="px-3 py-3 md:px-4">
                    {r.direction === "in" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent">
                        <ArrowUpCircle className="h-3 w-3" />
                        Entrée
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-800 ring-1 ring-inset ring-red-600/20 dark:bg-red-500/15 dark:text-red-300 dark:ring-transparent">
                        <ArrowDownCircle className="h-3 w-3" />
                        Sortie
                      </span>
                    )}
                  </td>
                  <td
                    data-label="Qté"
                    className={
                      "px-3 py-3 text-right font-medium md:px-4 " +
                      (r.direction === "in"
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300")
                    }
                  >
                    {r.direction === "in" ? "+" : "−"}
                    {r.qty}
                    {r.productUnit ? (
                      <span className="ml-1 text-[10px] font-normal text-slate-400 dark:text-slate-500">
                        {r.productUnit}
                      </span>
                    ) : null}
                  </td>
                  <td data-label="Produit" className="px-3 py-3 md:px-4">
                    <p className="font-medium text-slate-900 dark:text-white">
                      {r.productName}
                    </p>
                    {r.productCategory && (
                      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                        {r.productCategory}
                      </p>
                    )}
                  </td>
                  <td
                    data-label="Motif"
                    className="hidden px-3 py-3 text-xs text-slate-600 dark:text-slate-400 md:table-cell md:px-4"
                  >
                    {r.reason || (
                      <span className="text-slate-400 dark:text-slate-600">
                        —
                      </span>
                    )}
                  </td>
                  <td
                    data-label="Source"
                    className="hidden px-3 py-3 text-xs md:table-cell md:px-4"
                  >
                    {r.eventId ? (
                      <Link
                        href={`/dashboard/events/${r.eventId}`}
                        className="inline-flex items-center gap-1 text-slate-700 hover:text-[color:var(--color-grenat)] dark:text-slate-300 dark:hover:text-[color:var(--color-grenat-glow)]"
                      >
                        <span className="truncate">
                          {r.eventTitle ??
                            (r.eventDate
                              ? formatDateFR(r.eventDate)
                              : "Événement")}
                        </span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-500">
                        Manuel
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucun mouvement sur cette plage.
          </div>
        )}
      </div>

      {rows.length >= 1000 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          1000 mouvements chargés. Resserrez la plage de dates pour voir
          au-delà.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "warn" | "err";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "err"
        ? "text-red-700 dark:text-red-300"
        : tone === "warn"
          ? "text-amber-700 dark:text-amber-300"
          : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-1 font-semibold ${toneCls}`}>{value}</p>
      {hint && (
        <p className="text-[10px] text-slate-500 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}
