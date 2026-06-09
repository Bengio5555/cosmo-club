"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Wine } from "lucide-react";

export type CocktailRow = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  archived: boolean;
};

/**
 * Client-side cocktail search + grouped rendering. Server delivers the
 * full ordered list; the input filters in memory across name,
 * description and category so typing feels instant. Empty groups are
 * hidden while a search is active to keep the page tight.
 */
export function CocktailsBrowser({
  cocktails,
  ingredientCount,
}: {
  cocktails: CocktailRow[];
  ingredientCount: Record<string, number>;
}) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const { activeGroups, archivedMatches } = useMemo(() => {
    const filterPredicate = (c: CocktailRow) => {
      if (!normalized) return true;
      const hay = [c.name, c.description ?? "", c.category ?? ""]
        .join(" ")
        .toLowerCase();
      return hay.includes(normalized);
    };

    const active = cocktails.filter((c) => !c.archived && filterPredicate(c));
    const archived = cocktails.filter((c) => c.archived && filterPredicate(c));

    const byCategory = new Map<string, CocktailRow[]>();
    for (const c of active) {
      const cat = c.category || "— Sans catégorie";
      const arr = byCategory.get(cat) ?? [];
      arr.push(c);
      byCategory.set(cat, arr);
    }
    return {
      activeGroups: Array.from(byCategory.entries()),
      archivedMatches: archived,
    };
  }, [cocktails, normalized]);

  const totalActive = cocktails.filter((c) => !c.archived).length;
  const visibleActive = activeGroups.reduce((s, [, list]) => s + list.length, 0);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, description, catégorie…"
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

      <p className="text-[11px] text-slate-500 dark:text-slate-500">
        {normalized
          ? `${visibleActive} boisson${visibleActive > 1 ? "s" : ""} sur ${totalActive} active${totalActive > 1 ? "s" : ""}`
          : `${totalActive} boisson${totalActive > 1 ? "s" : ""} active${totalActive > 1 ? "s" : ""}`}
      </p>

      {/* Empty state — global */}
      {cocktails.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500 dark:shadow-none">
          <Wine className="h-6 w-6 text-slate-700" />
          <p>Aucune boisson pour l&apos;instant.</p>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Ajoute tes cocktails, softs, shots… pour débloquer le calcul
            automatique de stock sur la fiche événement.
          </p>
        </div>
      )}

      {/* Empty state — search */}
      {cocktails.length > 0 &&
        activeGroups.length === 0 &&
        archivedMatches.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500 dark:shadow-none">
            Aucune boisson ne correspond à{" "}
            <span className="font-medium text-slate-700 dark:text-slate-300">
              « {query} »
            </span>
            .
          </div>
        )}

      {/* Active list, grouped by category */}
      <div className="space-y-5">
        {activeGroups.map(([cat, list]) => (
          <section
            key={cat}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
          >
            <div className="border-b border-slate-200 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
              {cat}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {list.map((c) => {
                const count = ingredientCount[c.id] ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cocktails/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {c.name}
                        </p>
                        {c.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">
                            {c.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] ${
                          count === 0
                            ? "text-amber-400/70"
                            : "text-slate-500 dark:text-slate-500"
                        }`}
                      >
                        {count} ingrédient{count > 1 ? "s" : ""}
                        {count === 0 && " · à compléter"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {archivedMatches.length > 0 && (
          <details
            className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
            open={!!normalized}
          >
            <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-300 dark:text-slate-500">
              Archivés · {archivedMatches.length}
              {normalized && (
                <span className="ml-1 text-slate-400 dark:text-slate-600">
                  (résultats search)
                </span>
              )}
            </summary>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {archivedMatches.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/cocktails/${c.id}`}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500 opacity-70 transition-colors hover:bg-slate-100 hover:text-slate-300 dark:text-slate-500 dark:hover:bg-slate-900"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
