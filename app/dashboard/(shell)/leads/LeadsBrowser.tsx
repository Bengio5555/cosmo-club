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

// Pill coloring per status — same palette as StatusBadge.
const ACTIVE_TONE: Record<LeadStatus | "all", string> = {
  all: "bg-neutral-800 text-white",
  nouveau: "bg-blue-500/20 text-blue-200",
  contacte: "bg-amber-500/20 text-amber-200",
  devis_envoye: "bg-violet-500/20 text-violet-200",
  gagne: "bg-emerald-500/25 text-emerald-200",
  perdu: "bg-neutral-700/40 text-neutral-300",
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
      <div className="-mx-1 flex flex-wrap gap-1 rounded-lg border border-neutral-800 bg-neutral-950/60 p-1">
        {STATUS_TABS.map((t) => {
          const isActive = status === t.value;
          const tone = isActive
            ? ACTIVE_TONE[t.value]
            : "text-neutral-400 hover:bg-neutral-900 hover:text-white";
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
                    ? "bg-black/30 text-current"
                    : "bg-neutral-900 text-neutral-500")
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
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, email, entreprise, message…"
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 py-2 pl-9 pr-3 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
          />
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value as EventType | "all")}
          className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
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
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
        {visible.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-800 text-[10px] uppercase tracking-wide text-neutral-500">
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
              {visible.map((l) => (
                <tr
                  key={l.id}
                  className="border-t border-neutral-900 transition-colors hover:bg-neutral-900"
                >
                  <td className="px-3 py-3 md:px-4">
                    <Link href={`/dashboard/leads/${l.id}`} className="block">
                      <p className="font-medium text-white">
                        {l.contact_name || (
                          <span className="text-neutral-500">—</span>
                        )}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {l.contact_email}
                      </p>
                      {l.company && (
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {l.company}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <EventTypeLabel value={l.event_type} />
                  </td>
                  <td className="px-3 py-3 text-xs text-neutral-300 md:px-4">
                    {l.event_date ? (
                      formatDateFR(l.event_date)
                    ) : (
                      rawDateText(l.raw_payload) ?? (
                        <span className="text-neutral-500">—</span>
                      )
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-neutral-300 md:table-cell md:px-4">
                    {l.guests_count ?? <span className="text-neutral-500">—</span>}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-neutral-500 md:table-cell md:px-4">
                    {formatDateFR(l.created_at, { withTime: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
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
                  className="text-neutral-300 underline"
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
        <p className="text-[11px] text-neutral-500">
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
