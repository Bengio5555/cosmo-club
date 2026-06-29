"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

export type ProductChoice = {
  id: string;
  name: string;
  category: string;
  unit: string;
  content_per_unit: number | null;
  content_unit: string | null;
};

function label(p: ProductChoice): string {
  const suffix =
    p.content_per_unit && p.content_unit
      ? ` (${p.content_per_unit}${p.content_unit}/${p.unit})`
      : ` (${p.unit})`;
  return `${p.name}${suffix}`;
}

// Accent- and case-insensitive haystack so "biere" matches "Bière".
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/**
 * Searchable replacement for the native ingredient <select>. The product
 * catalogue is long (every bottle in stock), so a type-to-filter combobox
 * beats scrolling a grouped dropdown. Results stay grouped by category.
 */
export function ProductCombobox({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ProductChoice[];
  onChange: (productId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((p) => p.id === value) ?? null;

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const filtered = q
      ? options.filter((p) => norm(`${p.name} ${p.category}`).includes(q))
      : options;
    const map = new Map<string, ProductChoice[]>();
    for (const p of filtered) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries());
  }, [options, query]);

  const flatCount = groups.reduce((n, [, list]) => n + list.length, 0);

  // Close on outside click; focus the search field when opening.
  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const id = setTimeout(() => inputRef.current?.focus(), 20);
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-left text-sm text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
      >
        <span className={selected ? "truncate" : "truncate text-slate-400 dark:text-slate-500"}>
          {selected ? label(selected) : "— Choisir un produit —"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-950">
          <div className="flex items-center gap-2 border-b border-slate-200 px-2.5 py-2 dark:border-slate-800">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
                else if (e.key === "Enter") {
                  e.preventDefault();
                  const first = groups[0]?.[1]?.[0];
                  if (first) pick(first.id);
                }
              }}
              placeholder="Rechercher un produit…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
            />
          </div>

          <div className="max-h-72 overflow-y-auto py-1">
            {flatCount === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-500">
                Aucun produit pour « {query.trim()} »
              </p>
            ) : (
              groups.map(([cat, list]) => (
                <div key={cat}>
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {cat}
                  </p>
                  <ul>
                    {list.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => pick(p.id)}
                          className={
                            "block w-full px-3 py-1.5 text-left text-sm transition-colors " +
                            (p.id === value
                              ? "bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white"
                              : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900")
                          }
                        >
                          {label(p)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
