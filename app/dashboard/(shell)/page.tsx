import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  FileText,
  AlertCircle,
  Inbox,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  Clock,
  MapPin,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { QuickRemindButton } from "@/components/dashboard/QuickRemindButton";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { formatDateFR, formatEUR } from "@/lib/format";
import { autoStartDueEvents } from "./events/actions";
import type { Database } from "@/types/database";

type LeadStatus = Database["public"]["Enums"]["lead_status"];

export default async function DashboardHome() {
  await autoStartDueEvents();
  const supabase = await createClient();

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1)
    .toISOString()
    .slice(0, 10);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const fifteenDaysFromNow = new Date(today.getTime() + 15 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const tenDaysFromNow = new Date(today.getTime() + 10 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  // Parallel fetch
  const [
    { data: monthInvoices },
    { data: trendInvoices },
    { data: unpaidInvoices },
    { data: pendingQuotes },
    { data: leadsAll },
    { data: recentLeads },
    { data: lowStockProducts },
    { data: upcomingEvents },
    { data: cocktailWindowEvents },
    { data: stockWindowEvents },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("id,total_ttc,is_credit_note")
      .gte("issue_date", firstOfMonth)
      .neq("status", "brouillon")
      .neq("status", "annule"),
    // 6-month trend for the bar chart
    supabase
      .from("invoices")
      .select("issue_date,total_ttc,is_credit_note,status")
      .gte("issue_date", sixMonthsAgo)
      .neq("status", "brouillon")
      .neq("status", "annule"),
    supabase
      .from("invoices")
      .select(
        "id,number,status,issue_date,due_date,total_ttc,client_id,reminder_count,is_credit_note",
      )
      .in("status", ["envoye", "en_retard"])
      .eq("is_credit_note", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase.from("quotes").select("id,total_ttc,status").eq("status", "envoye"),
    // All leads — used both for the pipeline counts and recent feed
    supabase.from("leads").select("status"),
    supabase
      .from("leads")
      .select(
        "id,status,contact_name,contact_email,company,event_type,event_date,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("products")
      .select("id,name,category,stock_qty,min_threshold,unit")
      .eq("archived", false)
      .order("stock_qty", { ascending: true })
      .limit(50),
    supabase
      .from("events")
      .select(
        "id,title,date,start_time,location,status,client_id,guests_count",
      )
      .gte("date", todayISO)
      .lte("date", fifteenDaysFromNow)
      .neq("status", "annule")
      .order("date", { ascending: true })
      .limit(8),
    supabase
      .from("events")
      .select("id,date,status")
      .gte("date", todayISO)
      .lte("date", fifteenDaysFromNow)
      .neq("status", "annule")
      .neq("status", "termine"),
    supabase
      .from("events")
      .select("id,date,status")
      .gte("date", todayISO)
      .lte("date", tenDaysFromNow)
      .neq("status", "annule")
      .neq("status", "termine"),
  ]);

  // Pipeline counts per lead status
  const leadCounts: Record<LeadStatus, number> = {
    nouveau: 0,
    contacte: 0,
    devis_envoye: 0,
    gagne: 0,
    perdu: 0,
  };
  for (const l of leadsAll ?? []) {
    leadCounts[l.status as LeadStatus] += 1;
  }

  // 6-month revenue series, month label localized
  const monthlySeries: { month: string; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    const total = (trendInvoices ?? [])
      .filter((inv) => (inv.issue_date ?? "").startsWith(monthKey))
      .reduce((sum, inv) => sum + Number(inv.total_ttc ?? 0), 0);
    monthlySeries.push({ month: label, total });
  }
  const maxTrend = Math.max(1, ...monthlySeries.map((t) => t.total));
  const lastTwo = monthlySeries.slice(-2);
  const trendDelta =
    lastTwo.length === 2 && lastTwo[0].total > 0
      ? ((lastTwo[1].total - lastTwo[0].total) / lastTwo[0].total) * 100
      : 0;

  // Unpaid invoices remaining amounts
  const unpaidIds = (unpaidInvoices ?? []).map((i) => i.id);
  const { data: payments } = unpaidIds.length
    ? await supabase
        .from("invoice_payments")
        .select("invoice_id,amount")
        .in("invoice_id", unpaidIds)
    : { data: [] };
  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    paidByInvoice.set(
      p.invoice_id,
      (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount ?? 0),
    );
  }

  // Event meta (staff/cocktails/stock counts per event)
  const eventIds = (upcomingEvents ?? []).map((e) => e.id);
  const cocktailWindowIds = (cocktailWindowEvents ?? []).map((e) => e.id);
  const stockWindowIds = (stockWindowEvents ?? []).map((e) => e.id);

  const [
    { data: eventStaffRows },
    { data: eventCocktailRows },
    { data: eventStockRows },
  ] = await Promise.all([
    eventIds.length
      ? supabase.from("event_staff").select("event_id").in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    cocktailWindowIds.length
      ? supabase
          .from("event_cocktails")
          .select("event_id")
          .in("event_id", cocktailWindowIds)
      : Promise.resolve({ data: [] }),
    stockWindowIds.length
      ? supabase
          .from("event_stock")
          .select("event_id")
          .in("event_id", stockWindowIds)
      : Promise.resolve({ data: [] }),
  ]);

  const staffCountByEvent = new Map<string, number>();
  for (const r of eventStaffRows ?? []) {
    staffCountByEvent.set(
      r.event_id,
      (staffCountByEvent.get(r.event_id) ?? 0) + 1,
    );
  }
  const cocktailCountByEvent = new Map<string, number>();
  for (const r of eventCocktailRows ?? []) {
    cocktailCountByEvent.set(
      r.event_id,
      (cocktailCountByEvent.get(r.event_id) ?? 0) + 1,
    );
  }
  const stockCountByEvent = new Map<string, number>();
  for (const r of eventStockRows ?? []) {
    stockCountByEvent.set(
      r.event_id,
      (stockCountByEvent.get(r.event_id) ?? 0) + 1,
    );
  }
  const eventsWithoutCocktails = (cocktailWindowEvents ?? []).filter(
    (e) => (cocktailCountByEvent.get(e.id) ?? 0) === 0,
  );
  const eventsWithoutStock = (stockWindowEvents ?? []).filter(
    (e) => (stockCountByEvent.get(e.id) ?? 0) === 0,
  );
  const eventsWithoutStaff = (upcomingEvents ?? []).filter(
    (e) => (staffCountByEvent.get(e.id) ?? 0) === 0,
  );

  // Client names for events + factures
  const clientIds = Array.from(
    new Set([
      ...(upcomingEvents ?? [])
        .map((e) => e.client_id)
        .filter((x): x is string => !!x),
      ...(unpaidInvoices ?? [])
        .map((i) => i.client_id)
        .filter((x): x is string => !!x),
    ]),
  );
  const { data: clients } = clientIds.length
    ? await supabase
        .from("clients")
        .select("id,first_name,last_name,company_name,email")
        .in("id", clientIds)
    : { data: [] };
  const clientsMap = new Map((clients ?? []).map((c) => [c.id, c]));
  const clientName = (cid: string | null) => {
    if (!cid) return "—";
    const c = clientsMap.get(cid);
    if (!c) return "—";
    return (
      c.company_name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.email ||
      "—"
    );
  };

  // KPI aggregates
  const caMonth = (monthInvoices ?? []).reduce(
    (s, i) => s + Number(i.total_ttc ?? 0),
    0,
  );
  let totalRemaining = 0;
  const invoicesWithRemaining = (unpaidInvoices ?? []).filter((inv) => {
    const paid = paidByInvoice.get(inv.id) ?? 0;
    const remaining = Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
    if (remaining > 0) {
      totalRemaining += remaining;
      return true;
    }
    return false;
  });
  const pendingQuotesValue = (pendingQuotes ?? []).reduce(
    (s, q) => s + Number(q.total_ttc ?? 0),
    0,
  );
  const lowStock = (lowStockProducts ?? []).filter(
    (p) => Number(p.stock_qty) <= Number(p.min_threshold ?? 0),
  );
  const overdueInvoices = invoicesWithRemaining.filter(
    (inv) => inv.due_date && inv.due_date < todayISO,
  );
  const hasAlerts =
    overdueInvoices.length > 0 ||
    lowStock.length > 0 ||
    eventsWithoutStaff.length > 0 ||
    eventsWithoutCocktails.length > 0 ||
    eventsWithoutStock.length > 0;
  const topUnpaid = invoicesWithRemaining.slice(0, 5);

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        {/* ─── Header ─── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {today.toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Tableau de bord
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/leads"
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Voir les demandes
            </Link>
            <Link
              href="/dashboard/devis"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              Nouveau devis
            </Link>
          </div>
        </div>

        {/* ─── KPI Cards ─── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="CA du mois"
            value={formatEUR(caMonth)}
            icon={<Wallet className="h-4 w-4" />}
            delta={trendDelta}
            tone="emerald"
            href="/dashboard/factures"
          />
          <KpiCard
            label="Devis en attente"
            value={`${pendingQuotes?.length ?? 0}`}
            sub={pendingQuotesValue > 0 ? formatEUR(pendingQuotesValue) : "—"}
            icon={<FileText className="h-4 w-4" />}
            tone="violet"
            href="/dashboard/devis"
          />
          <KpiCard
            label="Factures à encaisser"
            value={`${invoicesWithRemaining.length}`}
            sub={totalRemaining > 0 ? formatEUR(totalRemaining) : "—"}
            icon={<AlertCircle className="h-4 w-4" />}
            tone="amber"
            href="/dashboard/factures"
          />
          <KpiCard
            label="Nouvelles demandes"
            value={`${leadCounts.nouveau}`}
            sub="à contacter"
            icon={<Inbox className="h-4 w-4" />}
            tone="blue"
            href="/dashboard/leads"
          />
        </div>

        {/* ─── Chart + Pipeline ─── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* CA 6 months bar chart */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Chiffre d&apos;affaires
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Sur les 6 derniers mois
                </p>
              </div>
              {Math.abs(trendDelta) >= 0.5 && (
                <span
                  className={
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold " +
                    (trendDelta >= 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300")
                  }
                >
                  {trendDelta >= 0 ? "↗" : "↘"} {Math.abs(trendDelta).toFixed(0)}%
                  <span className="font-normal opacity-70">vs. mois dernier</span>
                </span>
              )}
            </div>
            <RevenueChart series={monthlySeries} max={maxTrend} />
          </div>

          {/* Pipeline summary — counts leads (not quotes). A single
              lead can have several accepted quotes, so this won't
              match the devis page count by design. */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Pipeline des demandes
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Chaque demande compte 1 fois, peu importe le nombre de devis
            </p>
            <ul className="mt-5 space-y-3">
              <PipelineRow label="Nouvelle" count={leadCounts.nouveau} tone="blue" />
              <PipelineRow
                label="Contactée"
                count={leadCounts.contacte}
                tone="amber"
              />
              <PipelineRow
                label="Devis envoyé"
                count={leadCounts.devis_envoye}
                tone="violet"
              />
              <PipelineRow
                label="Gagnée"
                count={leadCounts.gagne}
                tone="emerald"
              />
            </ul>
            <Link
              href="/dashboard/leads"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Voir toutes les demandes
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* ─── Alerts band (Cosmo-specific, kept) ─── */}
        {hasAlerts && (
          <div className="mt-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
                Points d&apos;attention
              </p>
              <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-800 dark:text-amber-100/80">
                {overdueInvoices.length > 0 && (
                  <li>
                    <Link
                      href="/dashboard/factures?kind=factures"
                      className="hover:text-amber-950 dark:hover:text-white"
                    >
                      <strong className="text-amber-900 dark:text-amber-200">
                        {overdueInvoices.length}
                      </strong>{" "}
                      facture{overdueInvoices.length > 1 ? "s" : ""} en retard
                    </Link>
                  </li>
                )}
                {eventsWithoutStaff.length > 0 && (
                  <li>
                    <Link
                      href="/dashboard/events"
                      className="hover:text-amber-950 dark:hover:text-white"
                    >
                      <strong className="text-amber-900 dark:text-amber-200">
                        {eventsWithoutStaff.length}
                      </strong>{" "}
                      événement{eventsWithoutStaff.length > 1 ? "s" : ""} sans
                      staff (≤ 7j)
                    </Link>
                  </li>
                )}
                {eventsWithoutCocktails.length > 0 && (
                  <li>
                    <Link
                      href="/dashboard/events"
                      className="hover:text-amber-950 dark:hover:text-white"
                    >
                      <strong className="text-amber-900 dark:text-amber-200">
                        {eventsWithoutCocktails.length}
                      </strong>{" "}
                      événement{eventsWithoutCocktails.length > 1 ? "s" : ""}{" "}
                      sans menu (≤ 15j)
                    </Link>
                  </li>
                )}
                {eventsWithoutStock.length > 0 && (
                  <li>
                    <Link
                      href="/dashboard/events"
                      className="hover:text-amber-950 dark:hover:text-white"
                    >
                      <strong className="text-amber-900 dark:text-amber-200">
                        {eventsWithoutStock.length}
                      </strong>{" "}
                      événement{eventsWithoutStock.length > 1 ? "s" : ""} sans
                      stock (≤ 10j)
                    </Link>
                  </li>
                )}
                {lowStock.length > 0 && (
                  <li>
                    <Link
                      href="/dashboard/stock"
                      className="hover:text-amber-950 dark:hover:text-white"
                    >
                      <strong className="text-amber-900 dark:text-amber-200">
                        {lowStock.length}
                      </strong>{" "}
                      produit{lowStock.length > 1 ? "s" : ""} sous seuil
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* ─── Recent leads + Upcoming events (preview style) ─── */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Recent leads */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Demandes récentes
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {(recentLeads ?? []).length} dernier
                  {(recentLeads ?? []).length > 1 ? "s" : ""} lead
                  {(recentLeads ?? []).length > 1 ? "s" : ""} entrants
                </p>
              </div>
              <Link
                href="/dashboard/leads"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Voir tout
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(recentLeads ?? []).length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Aucune demande récente
                </li>
              ) : (
                (recentLeads ?? []).map((l) => {
                  const display =
                    l.contact_name || l.company || l.contact_email || "?";
                  return (
                    <li key={l.id}>
                      <Link
                        href={`/dashboard/leads/${l.id}`}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-[11px] font-semibold text-white">
                          {initials(display)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {display}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {l.contact_email}
                          </p>
                        </div>
                        <StatusBadge status={l.status} />
                      </Link>
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Upcoming events */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Prochains événements
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  15 jours à venir · {(upcomingEvents ?? []).length} prévu
                  {(upcomingEvents ?? []).length > 1 ? "s" : ""}
                </p>
              </div>
              <Link
                href="/dashboard/events"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Calendrier
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(upcomingEvents ?? []).length === 0 ? (
                <li className="px-6 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Pas d&apos;événement prévu dans les 15 prochains jours.
                </li>
              ) : (
                (upcomingEvents ?? []).map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/events/${e.id}`}
                      className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                        <span className="text-[9px] font-medium uppercase text-slate-500 dark:text-slate-400">
                          {new Date(e.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-lg font-semibold tabular-nums leading-none text-slate-900 dark:text-slate-100">
                          {new Date(e.date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                            {e.title}
                          </p>
                          <StatusBadge status={e.status} />
                        </div>
                        {/* Meta line under the event title. Each `<span>` is
                            a flex child; the address can be very long (we
                            stash door codes / floor info in the location
                            field), so the wrapper needs `min-w-0` to let
                            `truncate` engage — without it the inline-flex
                            sizes to its content and overflows the card. */}
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-slate-500 dark:text-slate-400">
                          {e.start_time && (
                            <span className="inline-flex shrink-0 items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {e.start_time.slice(0, 5)}
                            </span>
                          )}
                          {e.location && (
                            <span
                              className="inline-flex min-w-0 max-w-full items-center gap-1"
                              title={e.location}
                            >
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate">{e.location}</span>
                            </span>
                          )}
                          {clientName(e.client_id) !== "—" && (
                            <span
                              className="inline-block min-w-0 max-w-full truncate"
                              title={clientName(e.client_id)}
                            >
                              · {clientName(e.client_id)}
                            </span>
                          )}
                          {e.guests_count && (
                            <span className="shrink-0">
                              · {e.guests_count} pers.
                            </span>
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* ─── Factures à encaisser — Cosmo-specific, kept ─── */}
        {topUnpaid.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Factures à encaisser
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {invoicesWithRemaining.length} ouverte
                  {invoicesWithRemaining.length > 1 ? "s" : ""} ·{" "}
                  {formatEUR(totalRemaining)}
                </p>
              </div>
              <Link
                href="/dashboard/factures"
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                Tout voir <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {topUnpaid.map((inv) => {
                const paid = paidByInvoice.get(inv.id) ?? 0;
                const remaining =
                  Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
                const overdue = inv.due_date && inv.due_date < todayISO;
                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <Link
                      href={`/dashboard/factures/${inv.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {inv.number}
                        </span>
                        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                          · {clientName(inv.client_id)}
                        </span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={
                            overdue
                              ? "text-red-600 dark:text-red-300"
                              : "text-slate-500 dark:text-slate-400"
                          }
                        >
                          {inv.due_date ? (
                            <>
                              échéance {formatDateFR(inv.due_date)}
                              {overdue && " · en retard"}
                            </>
                          ) : (
                            "à réception"
                          )}
                        </span>
                        {(inv.reminder_count ?? 0) > 0 && (
                          <span className="text-amber-700 dark:text-amber-300">
                            · {inv.reminder_count} relance
                            {(inv.reminder_count ?? 0) > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={
                          "text-sm font-medium tabular-nums " +
                          (overdue
                            ? "text-red-600 dark:text-red-300"
                            : "text-amber-700 dark:text-amber-300")
                        }
                      >
                        {formatEUR(remaining)}
                      </span>
                      <QuickRemindButton invoiceId={inv.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

function KpiCard({
  label,
  value,
  sub,
  icon,
  delta,
  tone,
  href,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  delta?: number;
  tone: "emerald" | "violet" | "amber" | "blue";
  href: string;
}) {
  const TONE_BG: Record<typeof tone, string> = {
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    violet:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
  };
  const showTrend = typeof delta === "number" && !isNaN(delta) && delta !== 0;
  const isUp = (delta ?? 0) >= 0;
  return (
    <Link
      href={href}
      className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <div
          className={
            "flex h-7 w-7 items-center justify-center rounded-md " +
            TONE_BG[tone]
          }
        >
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {showTrend ? (
          <span
            className={
              "inline-flex items-center gap-0.5 font-medium " +
              (isUp
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400")
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
        <span className="text-slate-500 dark:text-slate-400">
          {sub ?? (showTrend ? "vs. mois dernier" : "")}
        </span>
      </div>
    </Link>
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
      <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {count}
      </span>
    </li>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/[\s.@-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}
