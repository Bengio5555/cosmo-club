"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, AlertTriangle } from "lucide-react";
import { formatDateFR, formatEUR } from "@/lib/format";
import { REVENUE_TYPE_LABEL, type EventType } from "@/lib/dashboard/revenue";
import type { MarginRow } from "./data";

type SortKey = "date" | "revenueNetHt" | "marginHt" | "marginPct" | "guests";

const STATUS_LABEL: Record<MarginRow["status"], string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

export function MarginTable({ rows, threshold }: { rows: MarginRow[]; threshold: number }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [type, setType] = useState<string>("tous");
  const [onlyDone, setOnlyDone] = useState(false);

  const types = useMemo(() => Array.from(new Set(rows.map((r) => r.type))), [rows]);

  const visible = useMemo(() => {
    const f = rows.filter((r) => (type === "tous" || r.type === type) && (!onlyDone || r.status === "termine"));
    const dir = sort.dir === "asc" ? 1 : -1;
    return f.sort((a, b) => {
      const av = a[sort.key] as number | string | null;
      const bv = b[sort.key] as number | string | null;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [rows, sort, type, onlyDone]);

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  const th = (k: SortKey, label: string, right?: boolean) => (
    <th className={`px-3 py-2 ${right ? "text-right" : "text-left"}`}>
      <button type="button" onClick={() => toggle(k)} className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white">
        {label}
        {sort.key === k && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          type="button"
          onClick={() => setType("tous")}
          className={`rounded-full border px-2.5 py-1 font-medium ${type === "tous" ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"}`}
        >
          Tous types
        </button>
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full border px-2.5 py-1 font-medium ${type === t ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"}`}
          >
            {REVENUE_TYPE_LABEL[t as EventType] ?? t}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <input type="checkbox" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} className="h-3.5 w-3.5" />
          Terminés seulement
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              {th("date", "Événement")}
              <th className="px-3 py-2 text-left">Type</th>
              {th("guests", "Invités", true)}
              {th("revenueNetHt", "CA HT net", true)}
              <th className="px-3 py-2 text-right">Boissons</th>
              <th className="px-3 py-2 text-right">Staff</th>
              <th className="px-3 py-2 text-right">Frais</th>
              {th("marginHt", "Marge", true)}
              {th("marginPct", "%", true)}
              <th className="px-3 py-2 text-left">Base</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {visible.map((r) => {
              const low = r.marginPct !== null && r.marginPct < threshold;
              return (
                <tr key={r.id} className={low ? "bg-rose-50/60 dark:bg-rose-950/20" : ""}>
                  <td className="min-w-[220px] px-3 py-2">
                    <Link href={`/dashboard/events/${r.id}`} className="font-medium text-slate-900 hover:underline dark:text-white">
                      {r.title}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatDateFR(r.date)} · {STATUS_LABEL[r.status]}
                      {r.client ? ` · ${r.client}` : ""}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-300">{REVENUE_TYPE_LABEL[r.type as EventType] ?? r.type}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-300">{r.guests ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-white">{r.revenueNetHt ? formatEUR(r.revenueNetHt) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{r.stockCostHt ? formatEUR(r.stockCostHt) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{r.staffCostHt ? formatEUR(r.staffCostHt) : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-400">{r.extraCostHt ? formatEUR(r.extraCostHt) : "—"}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${r.marginHt === null ? "text-slate-400" : r.marginHt < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {r.marginHt === null ? "—" : formatEUR(r.marginHt)}
                  </td>
                  <td className={`whitespace-nowrap px-3 py-2 text-right tabular-nums font-semibold ${low ? "text-rose-600 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                    {r.marginPct === null ? "—" : `${r.marginPct} %`}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {r.basis === "actual" ? (
                      <span className="rounded-full border border-emerald-300 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700 dark:border-emerald-800 dark:text-emerald-300">réel</span>
                    ) : r.basis === "projected" ? (
                      <span className="rounded-full border border-amber-300 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700 dark:border-amber-800 dark:text-amber-300">estimé</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {r.missing.length > 0 && (
                      <p className="mt-1 flex min-w-[9rem] items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300" title="À compléter pour une marge réelle">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{r.missing.join(", ")}</span>
                      </p>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                  Aucun événement sur cette sélection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
