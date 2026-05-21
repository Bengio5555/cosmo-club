"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Database } from "@/types/database";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { formatDateFR } from "@/lib/format";

type LeadStatus = Database["public"]["Enums"]["lead_status"];
type EventType = Database["public"]["Enums"]["event_type"];

type Lead = {
  id: string;
  status: LeadStatus;
  contact_name: string | null;
  contact_email: string | null;
  company: string | null;
  event_type: EventType | null;
  event_date: string | null;
  guests_count: number | null;
  message: string | null;
  raw_payload: unknown;
  created_at: string;
};

const STATUS_TABS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "devis_envoye", label: "Devis envoyé" },
  { value: "gagne", label: "Gagné" },
  { value: "perdu", label: "Perdu" },
];

// Pill coloring per status — same palette as StatusBadge. The "all"
// tab is the primary/dark variant (inverted between modes: dark bg +
// white text in light, light bg + dark text in dark) — the others
// keep the pastel-on-coloured-text identity of each status.
const ACTIVE_TONE: Record<LeadStatus | "all", string> = {
  all: "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
  nouveau:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200",
  contacte:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200",
  devis_envoye:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200",
  gagne:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/25 dark:text-emerald-200",
  perdu:
    "bg-slate-200 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300",
};

const TYPE_OPTIONS: { value: EventType | "all"; label: string }[] = [
  { value: "all", label: "Tous types" },
  { value: "mariage", label: "Mariage" },
  { value: "corporate", label: "Corporate" },
  { value: "prive", label: "Privé" },
  { value: "defile", label: "Défilé" },
  { value: "lancement", label: "Lancement" },
  { value: "autre", label: "Autre" },
];

/**
 * All filtering happens client-side on a pre-loaded array. Same
 * architecture as StaffTable: the server component delivers every
 * row once at page mount, and tabs/search re-filter in memory with
 * useMemo. Result: filter clicks are instantaneous — no SSR, no
 * Supabase roundtrip, no network latency.
 */
export function LeadsBrowser({ leads }: { leads: Lead[] }) {
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [type, setType] = useState<EventType | "all">("all");
  const [search, setSearch] = useState("");

  // Compteurs par statut sur la liste COMPLÈTE (pas filtrée par
  // search/type) — sinon le compteur "Nouveau (3)" deviendrait
  // "Nouveau (0)" dès qu'on tape un mot dans la search, ce qui est
  // troublant. Stats globales = boussole stable du pipeline.
  const counts = useMemo(() => {
    const c: Record<LeadStatus | "all", number> = {
      all: leads.length,
      nouveau: 0,
      contacte: 0,
      devis_envoye: 0,
      gagne: 0,
      perdu: 0,
    };
    for (const l of leads) c[l.status] += 1;
    return c;
  }, [leads]);

  const normalized = search.trim().toLowerCase();

  const visible = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (type !== "all" && l.event_type !== type) return false;
      if (!normalized) return true;
      const haystack = [
        l.contact_name ?? "",
        l.contact_email ?? "",
        l.company ?? "",
        l.message ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [leads, status, type, normalized]);

  const hasAnyFilter = status !== "all" || type !== "all" || normalized !== "";

  return (
    <div className="space-y-3">
      {/* Status tabs — instant filter, no navigation */}
      <div className="-mx-1 flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {STATUS_TABS.map((t) => {
          const isActive = status === t.value;
          const tone = isActive
            ? ACTIVE_TONE[t.value]
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white";
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => setStatus(t.value)}
              className={
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                tone
              }
            >
              <span>{t.label}</span>
              <span
                className={
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums " +
                  (isActive
                    ? "bg-black/15 text-current dark:bg-black/30"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-500")
                }
              >
                {counts[t.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + type filter */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, entreprise, message…"
            className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-600 dark:shadow-none"
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType | "all")}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:shadow-none"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasAnyFilter && (
          <button
            type="button"
            onClick={() => {
              setStatus("all");
              setType("all");
              setSearch("");
            }}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        {visible.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Contact</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Événement</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Date</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Invités
                </th>
                <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">
                  Reçu
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((l) => {
                const display =
                  l.contact_name || l.contact_email || l.company || "?";
                const initials = display
                  .split(/[\s.@-]+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w) => w[0]?.toUpperCase() ?? "")
                  .join("") || "?";
                return (
                <tr
                  key={l.id}
                  className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                >
                  <td className="px-3 py-3 md:px-4">
                    <Link
                      href={`/dashboard/leads/${l.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[10px] font-semibold text-slate-900 dark:text-white">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {l.contact_name || (
                            <span className="text-slate-400 dark:text-slate-500">
                              —
                            </span>
                          )}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {l.contact_email}
                        </p>
                        {l.company && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">
                            {l.company}
                          </p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <EventTypeLabel value={l.event_type} />
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 dark:text-slate-600 dark:text-slate-300 md:px-4">
                    {l.event_date ? (
                      formatDateFR(l.event_date)
                    ) : (
                      rawDateText(l.raw_payload) ?? (
                        <span className="text-slate-400 dark:text-slate-500">—</span>
                      )
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-600 dark:text-slate-300 md:table-cell md:px-4">
                    {l.guests_count ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-500 dark:text-slate-500 md:table-cell md:px-4">
                    {formatDateFR(l.created_at, { withTime: true })}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucune demande pour ces filtres.
            {hasAnyFilter && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setStatus("all");
                    setType("all");
                    setSearch("");
                  }}
                  className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  Réinitialiser
                </button>
                .
              </>
            )}
          </div>
        )}
      </div>

      {leads.length >= 500 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          500 premières demandes chargées. Les plus anciennes ne sont pas dans
          la liste.
        </p>
      )}
    </div>
  );
}

function rawDateText(payload: unknown): string | null {
  if (payload && typeof payload === "object" && "date" in payload) {
    const v = (payload as Record<string, unknown>).date;
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}
