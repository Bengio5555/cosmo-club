"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Contact,
  Inbox,
  FileText,
  Receipt,
  CalendarDays,
  Wine,
  Package,
  CornerDownLeft,
} from "lucide-react";

type HitType =
  | "clients"
  | "leads"
  | "quotes"
  | "invoices"
  | "events"
  | "cocktails"
  | "products";

type Hit = {
  id: string;
  type: HitType;
  label: string;
  hint?: string;
  href: string;
};

type Group = { type: HitType; label: string; hits: Hit[] };

const TYPE_ICON: Record<HitType, React.ComponentType<{ className?: string }>> = {
  clients: Contact,
  leads: Inbox,
  quotes: FileText,
  invoices: Receipt,
  events: CalendarDays,
  cocktails: Wine,
  products: Package,
};

const TYPE_TONE: Record<HitType, string> = {
  clients: "text-sky-600 dark:text-sky-400",
  leads: "text-violet-600 dark:text-violet-400",
  quotes: "text-amber-600 dark:text-amber-400",
  invoices: "text-emerald-600 dark:text-emerald-400",
  events: "text-pink-600 dark:text-pink-400",
  cocktails: "text-rose-600 dark:text-rose-400",
  products: "text-slate-600 dark:text-slate-400",
};

/**
 * Command palette ⌘K — searches across clients, leads, quotes,
 * invoices, events, cocktails, and catalog from a single input.
 * Inspired by Linear/Raycast: an overlay modal with grouped results
 * and full keyboard control. Arrow keys move the highlight across
 * the flat list of hits, Enter navigates, Escape closes.
 *
 * On desktop the trigger sits in the Topbar with a ⌘K hint. On
 * mobile the same button collapses to an icon-only round button and
 * the modal renders nearly full-screen for thumb reach.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Global hotkey: ⌘K / Ctrl+K opens. Escape closes (handled
  // independently below so the keydown listener still fires when the
  // input has focus).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset transient state every time the modal closes so reopening
  // is a fresh slate.
  useEffect(() => {
    if (!open) {
      setQ("");
      setGroups([]);
      setSelected(0);
      setLoading(false);
      return;
    }
    // Focus on next tick — the input may not be in the DOM yet on
    // the same render that flips `open` to true.
    const id = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  // Debounced fetch — 180 ms feels native and gives enough time for
  // multi-word queries.
  useEffect(() => {
    if (!open) return;
    const query = q.trim();
    if (query.length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/dashboard/search?q=${encodeURIComponent(query)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { groups?: Group[] };
        setGroups(json.groups ?? []);
        setSelected(0);
      } catch {
        // aborted or network failure — ignore, user will retype
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q, open]);

  // Flatten the grouped list so arrow-key navigation knows the linear
  // index of each hit. Memoized so the index map stays stable across
  // re-renders when nothing changed.
  const flat = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  // Arrow key navigation across the flat hits.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, Math.max(flat.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        const hit = flat[selected];
        if (hit) {
          e.preventDefault();
          router.push(hit.href);
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, selected, router]);

  // Keep the highlighted row visible as the user navigates with
  // arrows past the scroll viewport.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLAnchorElement>(
      `[data-hit-index="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected, groups]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Recherche globale"
        title="Recherche globale (⌘K)"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white md:h-8 md:rounded-md md:px-3 md:py-1.5"
      >
        <Search className="h-4 w-4 md:h-3.5 md:w-3.5" />
        <span className="hidden md:inline">Rechercher</span>
        <kbd className="hidden rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500 md:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recherche globale"
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/60 px-3 pt-[max(env(safe-area-inset-top),3rem)] backdrop-blur-sm md:pt-[10vh]"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="flex w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              {loading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Chercher un client, devis, cocktail, événement…"
                className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={close}
                className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                Esc
              </button>
            </div>

            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto pb-2"
            >
              {q.trim().length < 2 ? (
                <EmptyState
                  title="Tape au moins 2 caractères"
                  subtitle="Recherche dans les clients, demandes, devis, factures, événements, cocktails et catalogue."
                />
              ) : groups.length === 0 && !loading ? (
                <EmptyState
                  title={`Aucun résultat pour « ${q.trim()} »`}
                  subtitle="Essaie un nom de société, un numéro de devis, le titre d'un événement…"
                />
              ) : (
                groups.map((g) => {
                  let runningIndex = 0;
                  for (const prev of groups) {
                    if (prev.type === g.type) break;
                    runningIndex += prev.hits.length;
                  }
                  return (
                    <section key={g.type} className="px-2 pt-3">
                      <h3 className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                        {g.label}
                      </h3>
                      <ul>
                        {g.hits.map((hit, i) => {
                          const idx = runningIndex + i;
                          const Icon = TYPE_ICON[hit.type];
                          const isActive = idx === selected;
                          return (
                            <li key={hit.id}>
                              <a
                                href={hit.href}
                                data-hit-index={idx}
                                onMouseEnter={() => setSelected(idx)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(hit.href);
                                  setOpen(false);
                                }}
                                className={
                                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors " +
                                  (isActive
                                    ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                                    : "text-slate-700 dark:text-slate-300")
                                }
                              >
                                <Icon
                                  className={"h-4 w-4 shrink-0 " + TYPE_TONE[hit.type]}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-medium">{hit.label}</p>
                                  {hit.hint && (
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-500">
                                      {hit.hint}
                                    </p>
                                  )}
                                </div>
                                {isActive && (
                                  <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                                )}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })
              )}
            </div>

            <div className="hidden border-t border-slate-200 px-4 py-2 text-[10px] text-slate-500 dark:border-slate-800 dark:text-slate-500 md:flex md:items-center md:gap-4">
              <span>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                  ↑↓
                </kbd>{" "}
                naviguer
              </span>
              <span>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                  ↵
                </kbd>{" "}
                ouvrir
              </span>
              <span>
                <kbd className="rounded border border-slate-300 bg-slate-50 px-1 py-0.5 dark:border-slate-700 dark:bg-slate-900">
                  Esc
                </kbd>{" "}
                fermer
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="px-6 py-10 text-center">
      <Search className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-700" />
      <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
        {title}
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">{subtitle}</p>
    </div>
  );
}
