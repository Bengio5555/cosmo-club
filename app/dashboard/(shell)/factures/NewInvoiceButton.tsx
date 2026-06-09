"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  FilePlus,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { createBlankInvoice } from "./[id]/actions";

type ClientOption = { id: string; label: string; sub: string | null };

/**
 * "Nouvelle facture" — opens a small dialog to pick a client (optional)
 * then spins up a blank draft invoice and routes into its editor. Lets
 * the operator bill a client directly, without an accepted quote.
 */
export function NewInvoiceButton({ clients }: { clients: ClientOption[] }) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function create() {
    setErr(null);
    startTransition(async () => {
      const res = await createBlankInvoice(clientId);
      // createBlankInvoice redirects on success; we only get here on error.
      if (res && !res.ok) setErr(res.error);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        <FilePlus className="h-3.5 w-3.5" />
        Nouvelle facture
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nouvelle facture"
          onClick={() => !pending && setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-900">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Facturation directe
                </p>
                <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Nouvelle facture
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label="Fermer"
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Client
                </p>
                <ClientCombobox
                  clients={clients}
                  value={clientId}
                  onChange={setClientId}
                />
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-500">
                  Optionnel — tu pourras tout de même créer la facture et
                  ajouter le client plus tard. Un brouillon vide est créé,
                  prêt à recevoir les lignes.
                </p>
              </div>

              {err && (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
                  {err}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-slate-900">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:border-slate-400 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={create}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                <FilePlus className="h-3 w-3" /> Créer la facture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* Searchable client picker — same pattern as the cocktail combobox. */
function ClientCombobox({
  clients,
  value,
  onChange,
}: {
  clients: ClientOption[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.id === value) ?? null;
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const q = norm(query.trim());
  const filtered =
    q === ""
      ? clients
      : clients.filter(
          (c) => norm(c.label).includes(q) || (c.sub ? norm(c.sub).includes(q) : false),
        );

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  useEffect(() => setActiveIdx(0), [query]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-white px-2.5 py-2 text-left text-sm dark:bg-slate-900 ${
          open
            ? "border-[color:var(--color-grenat)]"
            : "border-slate-300 dark:border-slate-800"
        }`}
      >
        <span
          className={
            selected
              ? "truncate text-slate-900 dark:text-white"
              : "truncate text-slate-400 dark:text-slate-600"
          }
        >
          {selected ? selected.label : "Choisir un client (optionnel)…"}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-600" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-md border border-slate-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2 dark:border-slate-800">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const c = filtered[activeIdx];
                  if (c) {
                    onChange(c.id);
                    setOpen(false);
                  }
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Rechercher un client…"
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-600"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <X className="h-3 w-3" /> Aucun client
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-500 dark:text-slate-500">
                Aucun client ne correspond.
              </li>
            ) : (
              filtered.map((c, i) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm ${
                      i === activeIdx ? "bg-slate-100 dark:bg-slate-800" : ""
                    } ${
                      c.id === value
                        ? "text-[color:var(--color-grenat)]"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    <span className="min-w-0 truncate">
                      {c.label}
                      {c.sub && (
                        <span className="ml-1 text-slate-400 dark:text-slate-500">
                          · {c.sub}
                        </span>
                      )}
                    </span>
                    {c.id === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
