"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Download, Loader2, Search } from "lucide-react";
import type { Database } from "@/types/database";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { formatDateFR, formatEUR } from "@/lib/format";

type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

export type InvoiceRow = {
  id: string;
  number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  event_date: string | null;
  total_ht: number;
  total_ttc: number;
  is_credit_note: boolean;
  /** Resolved client display name (server-side). */
  who: string;
  /** Sum of payments recorded against this invoice. */
  paid: number;
  /** Sum of credit notes (avoirs) offsetting this invoice. */
  credited: number;
};

/** Amount still owed: total minus payments minus credit notes, floored at 0. */
function remainingOf(r: InvoiceRow): number {
  if (r.is_credit_note) return 0;
  return Math.round((Number(r.total_ttc) - r.paid - r.credited) * 100) / 100;
}

/**
 * Reading-order groups. An invoice lands in exactly one:
 *  - retard    : issued, past due, still owed (or explicit en_retard)
 *  - attente   : issued, not overdue, still owed
 *  - brouillon : drafts (not owed yet)
 *  - paye      : paid, or settled by credit note
 *  - annule    : cancelled
 *  - avoir     : credit notes (documents, never receivables)
 */
type GroupKey = "retard" | "attente" | "brouillon" | "paye" | "annule" | "avoir";

function groupOf(r: InvoiceRow, today: string): GroupKey {
  if (r.is_credit_note) return "avoir";
  if (r.status === "brouillon") return "brouillon";
  if (r.status === "annule") return "annule";
  const remaining = remainingOf(r);
  if (r.status === "paye" || remaining <= 0) return "paye";
  if (r.status === "en_retard" || (!!r.due_date && r.due_date < today)) {
    return "retard";
  }
  return "attente";
}

const GROUP_ORDER: GroupKey[] = [
  "retard",
  "attente",
  "brouillon",
  "paye",
  "annule",
  "avoir",
];

const GROUP_META: Record<
  GroupKey,
  { label: string; dot: string; amountLabel: string; defaultOpen: boolean }
> = {
  retard: {
    label: "En retard de règlement",
    dot: "bg-red-500",
    amountLabel: "à relancer",
    defaultOpen: true,
  },
  attente: {
    label: "En attente de règlement",
    dot: "bg-amber-500",
    amountLabel: "à encaisser",
    defaultOpen: true,
  },
  brouillon: {
    label: "Brouillons",
    dot: "bg-slate-400",
    amountLabel: "HT",
    defaultOpen: true,
  },
  paye: {
    label: "Payées & soldées",
    dot: "bg-emerald-500",
    amountLabel: "TTC",
    defaultOpen: false,
  },
  annule: {
    label: "Annulées",
    dot: "bg-slate-500",
    amountLabel: "TTC",
    defaultOpen: false,
  },
  avoir: {
    label: "Avoirs",
    dot: "bg-violet-500",
    amountLabel: "TTC",
    defaultOpen: false,
  },
};

/** Headline amount shown on a group header. */
function groupAmount(key: GroupKey, rows: InvoiceRow[]): number {
  switch (key) {
    case "retard":
    case "attente":
      return rows.reduce((s, r) => s + Math.max(0, remainingOf(r)), 0);
    case "brouillon":
      return rows.reduce((s, r) => s + Number(r.total_ht ?? 0), 0);
    default:
      return rows.reduce((s, r) => s + Math.abs(Number(r.total_ttc ?? 0)), 0);
  }
}

/**
 * Invoice list with instant client-side search (number + client name),
 * a status chip filter, and a grouped reading view. The server delivers
 * the rows already filtered by the date/type form; everything else is
 * in-memory. "Toutes" renders the grouped view (overdue first, then
 * awaiting payment, drafts; paid/cancelled/credit notes collapsed);
 * picking a chip shows that group as a flat table.
 */
export function FacturesBrowser({
  rows,
  hasServerFilter,
}: {
  rows: InvoiceRow[];
  hasServerFilter: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<GroupKey | "all">("all");
  const normalized = query.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  // Per-group collapse state — archive groups start folded so the page
  // stays readable as paid invoices pile up.
  const [openGroups, setOpenGroups] = useState<Record<GroupKey, boolean>>(() => {
    const init = {} as Record<GroupKey, boolean>;
    for (const k of GROUP_ORDER) init[k] = GROUP_META[k].defaultOpen;
    return init;
  });

  // PDF generation is server-side and takes a moment — swap the row's
  // download icon for a spinner while its blob is being produced.
  const [pdfId, setPdfId] = useState<string | null>(null);

  async function downloadPdf(inv: InvoiceRow) {
    if (pdfId) return;
    setPdfId(inv.id);
    try {
      const res = await fetch(`/api/dashboard/factures/${inv.id}/pdf`);
      if (!res.ok) {
        window.alert("Échec de la génération du PDF — réessaie.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const name = /filename="([^"]+)"/.exec(cd)?.[1] ?? `${inv.number}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Échec de la génération du PDF — réessaie.");
    } finally {
      setPdfId(null);
    }
  }

  const searched = useMemo(() => {
    if (!normalized) return rows;
    return rows.filter((r) =>
      `${r.number} ${r.who}`.toLowerCase().includes(normalized),
    );
  }, [rows, normalized]);

  const grouped = useMemo(() => {
    const map = new Map<GroupKey, InvoiceRow[]>();
    for (const k of GROUP_ORDER) map.set(k, []);
    for (const r of searched) map.get(groupOf(r, today))!.push(r);
    return map;
  }, [searched, today]);

  const visible = useMemo(
    () =>
      statusFilter === "all" ? searched : (grouped.get(statusFilter) ?? []),
    [statusFilter, searched, grouped],
  );

  // Totals recompute over the visible set so the bar always matches the
  // list (date/type filter + live search + status chip).
  const totals = useMemo(() => {
    let ht = 0;
    let paid = 0;
    let remaining = 0;
    for (const r of visible) {
      ht += Number(r.total_ht ?? 0);
      if (!r.is_credit_note) {
        paid += r.paid;
        // "Reste à encaisser" = only issued invoices (envoyé / en
        // retard). Drafts and cancelled ones aren't owed yet, so they're
        // excluded — same definition as the dashboard KPI.
        if (r.status === "envoye" || r.status === "en_retard") {
          remaining += Math.max(0, remainingOf(r));
        }
      }
    }
    return { ht, paid, remaining };
  }, [visible]);

  const chips: Array<{ key: GroupKey | "all"; label: string; count: number }> = [
    { key: "all", label: "Toutes", count: searched.length },
    ...GROUP_ORDER.map((k) => ({
      key: k,
      label: GROUP_META[k].label,
      count: (grouped.get(k) ?? []).length,
    })).filter((c) => c.count > 0),
  ];

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Numéro de facture ou client…"
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

      {/* Status chips */}
      {rows.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => {
            const active = statusFilter === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatusFilter(c.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                }`}
              >
                {c.key !== "all" && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${GROUP_META[c.key as GroupKey].dot}`}
                  />
                )}
                {c.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-semibold ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {c.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Totals bar (over the visible set) */}
      {rows.length > 0 && (
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-3 text-center">
          <Stat label={`Total HT (${visible.length})`} value={formatEUR(totals.ht)} />
          <Stat label="Encaissé" value={formatEUR(totals.paid)} tone="ok" />
          <Stat label="Reste à encaisser" value={formatEUR(totals.remaining)} tone="pending" />
        </div>
      )}

      {statusFilter === "all" ? (
        /* Grouped reading view */
        <div className="space-y-4">
          {GROUP_ORDER.filter((k) => (grouped.get(k) ?? []).length > 0).map(
            (k) => {
              const groupRows = grouped.get(k)!;
              const meta = GROUP_META[k];
              const open = openGroups[k];
              return (
                <section
                  key={k}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((s) => ({ ...s, [k]: !s[k] }))
                    }
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 md:px-4"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {meta.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {groupRows.length}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatEUR(groupAmount(k, groupRows))}
                        </span>{" "}
                        {meta.amountLabel}
                      </span>
                      {open ? (
                        <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      )}
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-slate-100 dark:border-slate-900">
                      <InvoiceTable
                        rows={groupRows}
                        today={today}
                        pdfId={pdfId}
                        onDownload={downloadPdf}
                      />
                    </div>
                  )}
                </section>
              );
            },
          )}
          {searched.length === 0 && (
            <EmptyState
              normalized={normalized}
              query={query}
              hasServerFilter={hasServerFilter}
            />
          )}
        </div>
      ) : (
        /* Flat view for a single status chip */
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          {visible.length > 0 ? (
            <InvoiceTable
              rows={visible}
              today={today}
              pdfId={pdfId}
              onDownload={downloadPdf}
            />
          ) : (
            <EmptyState
              normalized={normalized}
              query={query}
              hasServerFilter={hasServerFilter}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  normalized,
  query,
  hasServerFilter,
}: {
  normalized: string;
  query: string;
  hasServerFilter: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-500 dark:shadow-none">
      {normalized ? (
        <>
          Aucune facture ne correspond à{" "}
          <span className="font-medium text-slate-700 dark:text-slate-300">
            « {query} »
          </span>
          .
        </>
      ) : (
        <>
          Aucune facture{hasServerFilter ? " sur ce filtre" : ""}. Depuis un{" "}
          <Link
            href="/dashboard/devis"
            className="text-slate-700 underline hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            devis accepté
          </Link>
          , clique « Créer la facture » pour en générer une.
        </>
      )}
    </div>
  );
}

function InvoiceTable({
  rows,
  today,
  pdfId,
  onDownload,
}: {
  rows: InvoiceRow[];
  today: string;
  pdfId: string | null;
  onDownload: (inv: InvoiceRow) => void;
}) {
  return (
    <div className="table-as-cards">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
          <tr>
            <th className="px-3 py-2.5 font-medium md:px-4">Numéro</th>
            <th className="px-3 py-2.5 font-medium md:px-4">Client</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Événement</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Émise</th>
            <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Échéance</th>
            <th className="px-3 py-2.5 font-medium md:px-4">Statut</th>
            <th className="px-3 py-2.5 text-right font-medium md:px-4">Total HT</th>
            <th className="hidden px-3 py-2.5 text-right font-medium md:table-cell md:px-4">
              Reste
            </th>
            <th className="px-2 py-2.5 md:px-3">
              <span className="sr-only">Télécharger le PDF</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv) => {
            const remaining = remainingOf(inv);
            // A fully-credited invoice is settled — don't flag it overdue.
            const overdue =
              !inv.is_credit_note &&
              inv.status === "envoye" &&
              !!inv.due_date &&
              inv.due_date < today &&
              remaining > 0;
            return (
              <tr
                key={inv.id}
                className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
              >
                <td data-label-hidden className="px-3 py-3 md:px-4">
                  <Link
                    href={`/dashboard/factures/${inv.id}`}
                    className="inline-flex items-center gap-2 font-medium text-slate-900 transition-colors hover:text-[color:var(--color-grenat)] dark:text-white dark:hover:text-[color:var(--color-grenat-glow)]"
                  >
                    {inv.number}
                    {inv.is_credit_note && (
                      <span className="rounded-full border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-700 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200">
                        Avoir
                      </span>
                    )}
                  </Link>
                </td>
                <td data-label="Client" className="px-3 py-3 text-slate-700 dark:text-slate-200 md:px-4">
                  {inv.who}
                </td>
                <td data-label="Événement" className="hidden px-3 py-3 text-xs text-slate-600 dark:text-slate-300 md:table-cell md:px-4">
                  {inv.event_date ? (
                    formatDateFR(inv.event_date)
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600">—</span>
                  )}
                </td>
                <td data-label="Émise" className="hidden px-3 py-3 text-xs text-slate-500 dark:text-slate-400 md:table-cell md:px-4">
                  {formatDateFR(inv.issue_date)}
                </td>
                <td data-label="Échéance" className="hidden px-3 py-3 text-xs md:table-cell md:px-4">
                  {inv.due_date ? (
                    <span className={overdue ? "text-red-600 dark:text-red-300" : "text-slate-500 dark:text-slate-400"}>
                      {formatDateFR(inv.due_date)}
                      {overdue && <span className="ml-1 text-red-600 dark:text-red-400">(en retard)</span>}
                    </span>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-500">—</span>
                  )}
                </td>
                <td data-label="Statut" className="px-3 py-3 md:px-4">
                  <StatusBadge
                    status={overdue && inv.status === "envoye" ? "en_retard" : inv.status}
                  />
                </td>
                <td
                  data-label="Total HT"
                  className={`px-3 py-3 text-right font-medium md:px-4 ${
                    inv.is_credit_note
                      ? "text-violet-700 dark:text-violet-200"
                      : "text-slate-900 dark:text-slate-200"
                  }`}
                >
                  {formatEUR(Number(inv.total_ht))}
                  <p className="text-[11px] font-normal text-slate-500 dark:text-slate-500">
                    {formatEUR(Number(inv.total_ttc))} TTC
                  </p>
                </td>
                <td data-label="Reste" className="hidden px-3 py-3 text-right md:table-cell md:px-4">
                  {inv.is_credit_note ? (
                    <span className="text-xs text-slate-400 dark:text-slate-600">—</span>
                  ) : remaining <= 0 ? (
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                      {inv.credited > 0 && inv.paid <= 0 ? "Soldé (avoir)" : "Soldé"}
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-medium ${
                        overdue
                          ? "text-red-600 dark:text-red-300"
                          : "text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {formatEUR(remaining)}
                    </span>
                  )}
                </td>
                <td data-label-hidden className="px-2 py-3 text-right md:px-3">
                  <button
                    type="button"
                    onClick={() => onDownload(inv)}
                    disabled={pdfId !== null}
                    title={`Télécharger ${inv.number} en PDF`}
                    aria-label={`Télécharger ${inv.number} en PDF`}
                    className="inline-flex rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    {pdfId === inv.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "pending";
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "pending"
        ? "text-amber-700 dark:text-amber-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-sm font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}
