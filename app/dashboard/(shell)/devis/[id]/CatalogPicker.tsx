"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Library, Search, X } from "lucide-react";
import type { Tables } from "@/types/database";
import { formatEUR } from "@/lib/format";

type CatalogItem = Tables<"catalog_items">;

export type PickedItem = {
  title: string;
  description: string | null;
  section: string | null;
  unit: string | null;
  unit_price_ht: number;
};

/**
 * Small right-side drawer listing the catalog with a search input and a
 * one-click insert. Loads items once lazily on first open.
 */
export function CatalogPicker({
  onPick,
  defaultSection,
}: {
  onPick: (items: PickedItem[], targetSection: string | null) => void;
  defaultSection?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CatalogItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetSection, setTargetSection] = useState<string>(defaultSection ?? "");

  // Lazy load catalog the first time the drawer opens.
  useEffect(() => {
    if (!open || items !== null) return;
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/catalog")
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then((json) => setItems(json.items as CatalogItem[]))
      .catch((e) => setError(e.message ?? "Erreur de chargement"))
      .finally(() => setLoading(false));
  }, [open, items]);

  // Keep target section in sync with the parent default (editor may have
  // changed which section is "active" between two opens).
  useEffect(() => {
    if (open && defaultSection && defaultSection !== targetSection) {
      setTargetSection(defaultSection);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sections = useMemo(() => {
    const s = new Set<string>();
    for (const it of items ?? []) if (it.section) s.add(it.section);
    return [...s];
  }, [items]);

  const filtered = useMemo(() => {
    const pool = items ?? [];
    if (!q.trim()) return pool;
    const needle = q.trim().toLowerCase();
    return pool.filter(
      (it) =>
        it.title.toLowerCase().includes(needle) ||
        (it.description ?? "").toLowerCase().includes(needle) ||
        (it.section ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const it of filtered) {
      const key = it.section ?? "Autres";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [filtered]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    if (!items || selected.size === 0) return;
    const picks = items
      .filter((i) => selected.has(i.id))
      .map<PickedItem>((i) => ({
        title: i.title,
        description: i.description,
        section: targetSection || i.section,
        unit: i.unit,
        unit_price_ht: i.unit_price_ht,
      }));
    onPick(picks, targetSection || null);
    setSelected(new Set());
    setQ("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-700 dark:text-slate-200 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
      >
        <Library className="h-3 w-3" /> Catalogue
      </button>

      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Catalogue</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-500">
                Sélectionne une ou plusieurs prestations à ajouter au devis.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Chercher une prestation…"
                autoFocus
                className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </div>
            <label className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Ajouter à la section
              </span>
              <input
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                placeholder={defaultSection || "Bar à cocktails, Barista…"}
                list="catalog-sections"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
              <datalist id="catalog-sections">
                {sections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-500">Chargement…</p>
            )}
            {error && (
              <p className="p-6 text-center text-sm text-red-300">{error}</p>
            )}
            {!loading && !error && (items?.length ?? 0) === 0 && (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-500">
                Aucune prestation enregistrée.
                <br />
                <Link
                  href="/dashboard/catalog"
                  className="mt-2 inline-block text-slate-600 dark:text-slate-300 underline"
                >
                  Créer ton catalogue →
                </Link>
              </div>
            )}
            {!loading && grouped.length === 0 && (items?.length ?? 0) > 0 && (
              <p className="p-6 text-center text-sm text-slate-500 dark:text-slate-500">
                Aucun résultat pour « {q} ».
              </p>
            )}
            {grouped.map(([section, list]) => (
              <div key={section}>
                <p className="sticky top-0 bg-white dark:bg-slate-950/90 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 backdrop-blur">
                  {section}
                </p>
                <ul className="divide-y divide-slate-100 dark:divide-slate-900">
                  {list.map((it) => {
                    const on = selected.has(it.id);
                    return (
                      <li key={it.id}>
                        <button
                          type="button"
                          onClick={() => toggle(it.id)}
                          className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                            on
                              ? "bg-[color:var(--color-grenat)]/10"
                              : "hover:bg-slate-100 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              on
                                ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)] text-slate-900 dark:text-white"
                                : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900"
                            }`}
                            aria-hidden
                          >
                            {on && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                              {it.title}
                            </span>
                            {it.description && (
                              <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                                {it.description}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
                            {formatEUR(it.unit_price_ht ?? 0)}
                            {it.unit ? (
                              <span className="ml-1 text-[10px] text-slate-500 dark:text-slate-500">
                                /{it.unit}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <footer className="flex items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-4 py-3">
            <span className="text-xs text-slate-500 dark:text-slate-500">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={selected.size === 0}
                className="rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Ajouter au devis
              </button>
            </div>
          </footer>
        </Drawer>
      )}
    </>
  );
}

/* ─── Overlay drawer ──────────────────────────────────────────────── */

function Drawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Lock body scroll + handle Escape.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      ref={ref}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white dark:bg-slate-950 shadow-2xl md:border-l md:border-neutral-800">
        {children}
      </div>
    </div>
  );
}
