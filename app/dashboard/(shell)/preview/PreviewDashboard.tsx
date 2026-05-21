"use client";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
  Inbox,
  CalendarDays,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

type Stats = {
  caMonth: number;
  unpaidAmount: number;
  unpaidCount: number;
  pendingAmount: number;
  pendingCount: number;
  newLeads: number;
};

type Lead = {
  id: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  company: string | null;
  event_type: string | null;
  event_date: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  location: string | null;
  status: string;
  guests_count: number | null;
};

function formatEUR(n: number) {
  return n.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

function initials(name: string | null, fallback: string | null = null) {
  const src = (name ?? fallback ?? "?").trim();
  if (!src) return "?";
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STATUS_BADGE: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  nouveau: {
    bg: "bg-blue-50 dark:bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-600/20 dark:ring-blue-400/30",
    label: "Nouveau",
  },
  contacte: {
    bg: "bg-amber-50 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-600/20 dark:ring-amber-400/30",
    label: "Contacté",
  },
  devis_envoye: {
    bg: "bg-violet-50 dark:bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-600/20 dark:ring-violet-400/30",
    label: "Devis envoyé",
  },
  gagne: {
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-600/20 dark:ring-emerald-400/30",
    label: "Gagné",
  },
  perdu: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    ring: "ring-slate-300/40 dark:ring-slate-700",
    label: "Perdu",
  },
};

export function PreviewDashboard({
  stats,
  trend,
  recentLeads,
  upcomingEvents,
}: {
  stats: Stats;
  trend: { month: string; total: number }[];
  recentLeads: Lead[];
  upcomingEvents: EventRow[];
}) {
  const maxTrend = Math.max(1, ...trend.map((t) => t.total));
  const lastTwo = trend.slice(-2);
  const trendDelta =
    lastTwo.length === 2 && lastTwo[0].total > 0
      ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
      : 0;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Aperçu design · shadcn / Zenith style
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 dark:text-slate-100 md:text-3xl">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700">
              Exporter le rapport
            </button>
            <button className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
              Nouveau devis
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="CA du mois"
            value={formatEUR(stats.caMonth)}
            icon={<Wallet className="h-4 w-4" />}
            delta={trendDelta}
            tone="emerald"
          />
          <KpiCard
            label="Devis en attente"
            value={`${stats.pendingCount}`}
            sub={formatEUR(stats.pendingAmount)}
            icon={<FileText className="h-4 w-4" />}
            tone="violet"
          />
          <KpiCard
            label="Factures à encaisser"
            value={`${stats.unpaidCount}`}
            sub={formatEUR(stats.unpaidAmount)}
            icon={<AlertCircle className="h-4 w-4" />}
            tone="amber"
          />
          <KpiCard
            label="Nouvelles demandes"
            value={`${stats.newLeads}`}
            sub="à contacter"
            icon={<Inbox className="h-4 w-4" />}
            tone="blue"
          />
        </div>

        {/* Chart + side info */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Bar chart */}
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Chiffre d&apos;affaires
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Sur les 6 derniers mois
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 p-1">
                {["6M", "1Y", "Tout"].map((label, i) => (
                  <button
                    key={label}
                    className={
                      "rounded px-2.5 py-1 text-[11px] font-medium transition-colors " +
                      (i === 0
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex h-48 items-end gap-3">
              {trend.map((t, i) => {
                const h = (t.total / maxTrend) * 100;
                const isLast = i === trend.length - 1;
                return (
                  <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {t.total > 0 ? formatEUR(t.total) : ""}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={
                          "w-full rounded-t-md " +
                          (isLast ? "bg-slate-900 dark:bg-slate-100" : "bg-slate-200 dark:bg-slate-700")
                        }
                        style={{ height: `${Math.max(2, h)}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">
                      {t.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline résumé */}
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-6 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Pipeline</h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Demandes en cours</p>
            <ul className="mt-5 space-y-3">
              <PipelineRow label="Nouveau" count={stats.newLeads} tone="blue" />
              <PipelineRow label="Contacté" count={0} tone="amber" />
              <PipelineRow label="Devis envoyé" count={stats.pendingCount} tone="violet" />
              <PipelineRow label="Gagné" count={3} tone="emerald" />
            </ul>
            <button className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white">
              Voir toutes les demandes
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Two columns: recent leads + upcoming events */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent leads */}
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Demandes récentes
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Les 6 derniers leads entrants
                </p>
              </div>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLeads.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucune demande récente
                </li>
              ) : (
                recentLeads.map((l) => {
                  const badge = STATUS_BADGE[l.status] ?? STATUS_BADGE.nouveau;
                  return (
                    <li
                      key={l.id}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-semibold text-white">
                        {initials(l.contact_name, l.company)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {l.contact_name || l.company || "Anonyme"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {l.contact_email}
                        </p>
                      </div>
                      <span
                        className={
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
                          badge.bg +
                          " " +
                          badge.text +
                          " " +
                          badge.ring
                        }
                      >
                        {badge.label}
                      </span>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Upcoming events */}
          <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Prochains événements
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  À venir dans les prochains jours
                </p>
              </div>
              <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                Calendrier
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcomingEvents.length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500">
                  Aucun événement prévu
                </li>
              ) : (
                upcomingEvents.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <span className="text-[9px] font-medium uppercase text-slate-500">
                        {new Date(e.date).toLocaleDateString("fr-FR", { month: "short" })}
                      </span>
                      <span className="text-lg font-semibold tabular-nums leading-none text-slate-900">
                        {new Date(e.date).getDate()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {e.title}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {e.location ?? "—"}
                        {e.guests_count ? ` · ${e.guests_count} invités` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {e.start_time ?? "—"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  delta,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  delta?: number;
  tone: "emerald" | "violet" | "amber" | "blue";
}) {
  const TONE_BG: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  };
  const showTrend = typeof delta === "number" && !isNaN(delta) && delta !== 0;
  const isUp = (delta ?? 0) >= 0;
  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <div
          className={
            "flex h-7 w-7 items-center justify-center rounded-md " + TONE_BG[tone]
          }
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {showTrend ? (
          <span
            className={
              "inline-flex items-center gap-0.5 font-medium " +
              (isUp ? "text-emerald-600" : "text-red-600")
            }
          >
            {isUp ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta!).toFixed(0)}%
          </span>
        ) : null}
        <span className="text-slate-500">{sub ?? (showTrend ? "vs. mois dernier" : "")}</span>
      </div>
    </div>
  );
}

function PipelineRow({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "blue" | "amber" | "violet" | "emerald";
}) {
  const DOT: Record<typeof tone, string> = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    emerald: "bg-emerald-500",
  };
  return (
    <li className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2.5">
        <span className={"h-2 w-2 rounded-full " + DOT[tone]} />
        <span className="text-slate-700 dark:text-slate-300">{label}</span>
      </div>
      <span className="font-semibold tabular-nums text-slate-900">{count}</span>
    </li>
  );
}
