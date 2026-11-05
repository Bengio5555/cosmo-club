"use client";

import { useMemo, useState } from "react";
import {
  CHANGE_AREAS,
  CHANGE_KIND_LABEL,
  type ChangeArea,
  type ChangeEntry,
  type ChangeKind,
} from "@/lib/changelog";

const KIND_CLS: Record<ChangeKind, string> = {
  nouveau: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  amelioration: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  correction: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
      : "border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-white"
  }`;

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/**
 * Journal des mises à jour (Paramètres → Mises à jour) : entrées de
 * lib/changelog.ts, les plus récentes en haut, regroupées par mois, avec
 * un filtre par rubrique et une recherche.
 */
export function ChangelogView({ entries }: { entries: ChangeEntry[] }) {
  const [area, setArea] = useState<ChangeArea | "toutes">("toutes");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = entries
      .filter((e) => area === "toutes" || e.area === area)
      .filter((e) => !needle || `${e.title} ${e.detail ?? ""} ${e.area}`.toLowerCase().includes(needle))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    const byMonth = new Map<string, ChangeEntry[]>();
    for (const e of filtered) {
      const key = e.date.slice(0, 7);
      byMonth.set(key, [...(byMonth.get(key) ?? []), e]);
    }
    return { months: [...byMonth.entries()], count: filtered.length };
  }, [entries, area, q]);

  const usedAreas = CHANGE_AREAS.filter((a) => entries.some((e) => e.area === a));

  return (
    <div className="max-w-3xl">
      <div className="mb-5 flex flex-col gap-3">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une mise à jour…"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white md:max-w-sm"
        />
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={chip(area === "toutes")} onClick={() => setArea("toutes")}>
            Tout
          </button>
          {usedAreas.map((a) => (
            <button key={a} type="button" className={chip(area === a)} onClick={() => setArea(a)}>
              {a}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {groups.count} mise{groups.count > 1 ? "s" : ""} à jour
        </p>
      </div>

      {groups.months.length === 0 ? (
        <p className="rounded-lg border border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-800">
          Aucune mise à jour ne correspond.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.months.map(([month, items]) => (
            <section key={month}>
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{monthLabel(month)}</h2>
              <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
                {items.map((e, i) => (
                  <li key={`${e.date}-${i}`} className="flex gap-4 px-4 py-3 md:px-5">
                    <span className="w-14 shrink-0 pt-0.5 text-xs tabular-nums text-slate-500">{dayLabel(e.date)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${KIND_CLS[e.kind]}`}>
                          {CHANGE_KIND_LABEL[e.kind]}
                        </span>
                        <span className="text-[11px] text-slate-500">{e.area}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">{e.title}</p>
                      {e.detail && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{e.detail}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
