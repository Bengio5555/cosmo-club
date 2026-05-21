"use client";

import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  Download,
  Columns3,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
  Check,
} from "lucide-react";

type ClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  created_at: string;
  archived: boolean;
  ca: number;
  orders: number;
  quotes: number;
  lastDate: string | null;
};

const TABS = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "withOrders", label: "Avec commandes" },
  { value: "archived", label: "Archivés" },
] as const;
type Tab = (typeof TABS)[number]["value"];

function initials(c: ClientRow) {
  const parts = [c.first_name, c.last_name].filter(Boolean) as string[];
  if (parts.length === 0) return (c.company_name ?? "?").slice(0, 2).toUpperCase();
  return parts
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function fullName(c: ClientRow) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
}

function formatEUR(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PreviewClientsTable({ clients }: { clients: ClientRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ key: "ca" | "orders" | "lastDate"; dir: "asc" | "desc" }>({
    key: "lastDate",
    dir: "desc",
  });

  const counts = useMemo(
    () => ({
      all: clients.length,
      active: clients.filter((c) => !c.archived).length,
      withOrders: clients.filter((c) => c.orders > 0).length,
      archived: clients.filter((c) => c.archived).length,
    }),
    [clients],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = clients.filter((c) => {
      if (tab === "active" && c.archived) return false;
      if (tab === "withOrders" && c.orders === 0) return false;
      if (tab === "archived" && !c.archived) return false;
      if (!q) return true;
      const hay = [c.first_name, c.last_name, c.company_name, c.email, c.city]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [clients, tab, search, sort]);

  function toggleSort(key: typeof sort.key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" },
    );
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleAll() {
    if (allVisibleSelected) {
      const next = new Set(selected);
      for (const c of filtered) next.delete(c.id);
      setSelected(next);
    } else {
      const next = new Set(selected);
      for (const c of filtered) next.add(c.id);
      setSelected(next);
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-full bg-slate-50 px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Page header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Aperçu design · shadcn / Zenith style
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Clients
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Gérez vos clients, suivez le CA cumulé et leurs dernières
              prestations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50">
              <Download className="h-4 w-4" />
              Exporter
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Nouveau client
            </button>
          </div>
        </div>

        {/* Tabs row */}
        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {TABS.map((t) => {
              const active = tab === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTab(t.value)}
                  className={
                    "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                  }
                >
                  <span>{t.label}</span>
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
                      (active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600")
                    }
                  >
                    {counts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrer les clients…"
                className="w-72 rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-100"
              />
            </div>
            <button className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              <Columns3 className="h-4 w-4" />
              Colonnes
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Selection banner */}
        {selected.size > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-md border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm">
            <span>
              <strong className="font-semibold">{selected.size}</strong>{" "}
              {selected.size > 1 ? "clients sélectionnés" : "client sélectionné"}
            </span>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Archiver
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3">
                  <button
                    onClick={toggleAll}
                    className={
                      "flex h-4 w-4 items-center justify-center rounded border transition-colors " +
                      (allVisibleSelected
                        ? "border-slate-900 bg-slate-900"
                        : "border-slate-300 hover:border-slate-400")
                    }
                    aria-label="Tout sélectionner"
                  >
                    {allVisibleSelected && <Check className="h-3 w-3 text-white" />}
                  </button>
                </th>
                <th className="px-4 py-3">Client</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 lg:table-cell">Ville</th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => toggleSort("orders")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Commandes
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    onClick={() => toggleSort("ca")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    CA cumulé
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="hidden px-4 py-3 lg:table-cell">
                  <button
                    onClick={() => toggleSort("lastDate")}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    Dernière activité
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="w-10 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleOne(c.id)}
                      className={
                        "flex h-4 w-4 items-center justify-center rounded border transition-colors " +
                        (selected.has(c.id)
                          ? "border-slate-900 bg-slate-900"
                          : "border-slate-300 hover:border-slate-400")
                      }
                    >
                      {selected.has(c.id) && <Check className="h-3 w-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-semibold text-white">
                        {initials(c)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {c.company_name || fullName(c)}
                        </p>
                        {c.company_name && (
                          <p className="truncate text-xs text-slate-500">{fullName(c)}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {c.email ? (
                      <span className="text-sm">{c.email}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                    {c.city || <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.orders > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        {c.orders}
                      </span>
                    ) : c.quotes > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                        {c.quotes} devis
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-slate-900">
                    {c.ca > 0 ? (
                      formatEUR(c.ca)
                    ) : (
                      <span className="font-normal text-slate-400">—</span>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-sm text-slate-500 lg:table-cell">
                    {formatDate(c.lastDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                    Aucun client pour ces filtres.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>
              {filtered.length} client{filtered.length > 1 ? "s" : ""} affiché
              {filtered.length > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-400 disabled:opacity-50"
              >
                Précédent
              </button>
              <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Suivant
              </button>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Démo de design — aucune action n&apos;est persistée. Si tu valides,
          on migre les pages réelles dans ce style.
        </p>
      </div>
    </div>
  );
}
