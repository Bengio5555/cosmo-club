import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Inbox,
  FileText,
  FileCheck2,
  Receipt,
  Package,
  ArrowRight,
  AlertTriangle,
  CalendarDays,
  Euro,
  Clock,
  Users,
  ArrowUpCircle,
  ArrowDownCircle,
  Zap,
} from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { EventTypeLabel } from "@/components/dashboard/EventTypeLabel";
import { QuickRemindButton } from "@/components/dashboard/QuickRemindButton";
import { formatDateFR, formatEUR } from "@/lib/format";

export default async function DashboardHome() {
  const supabase = await createClient();

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const firstOfYear = new Date(today.getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10);
  const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);

  // ─── Fan out all queries in parallel ───────────────────────────
  const [
    { data: monthInvoices },
    { data: unpaidInvoices },
    { data: pendingQuotes },
    { data: signedQuotesYear },
    { count: leadsNew },
    { data: recentLeads },
    { data: lowStockProducts },
    { data: upcomingEvents },
    { data: recentMovements },
  ] = await Promise.all([
    // CA du mois: issued invoices (not draft/cancelled) this calendar month
    supabase
      .from("invoices")
      .select("id,total_ttc,is_credit_note")
      .gte("issue_date", firstOfMonth)
      .neq("status", "brouillon")
      .neq("status", "annule"),
    // Invoices still owed money
    supabase
      .from("invoices")
      .select(
        "id,number,status,issue_date,due_date,total_ttc,client_id,reminder_count,is_credit_note",
      )
      .in("status", ["envoye", "en_retard"])
      .eq("is_credit_note", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    // Pending quotes
    supabase
      .from("quotes")
      .select("id,total_ttc,status")
      .eq("status", "envoye"),
    // Signed quotes — current calendar year, by accepted_at
    supabase
      .from("quotes")
      .select("id,total_ttc,accepted_at")
      .eq("status", "accepte")
      .gte("accepted_at", firstOfYear),
    // New leads count
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "nouveau"),
    // Recent leads (top 5)
    supabase
      .from("leads")
      .select("id,status,contact_name,contact_email,event_type,event_date,created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    // Low stock
    supabase
      .from("products")
      .select("id,name,category,stock_qty,min_threshold,unit")
      .eq("archived", false)
      .order("stock_qty", { ascending: true })
      .limit(50),
    // Upcoming events (next 7 days)
    supabase
      .from("events")
      .select("id,title,date,start_time,location,status,client_id,guests_count")
      .gte("date", todayISO)
      .lte("date", sevenDaysFromNow)
      .neq("status", "annule")
      .order("date", { ascending: true }),
    // Recent stock movements
    supabase
      .from("stock_movements")
      .select("id,product_id,qty,direction,reason,created_at,event_id")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // ─── Derive payments per invoice (for remaining amounts) ────────
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

  // ─── Derive staff counts for upcoming events ───────────────────
  const eventIds = (upcomingEvents ?? []).map((e) => e.id);
  const { data: eventStaffRows } = eventIds.length
    ? await supabase
        .from("event_staff")
        .select("event_id")
        .in("event_id", eventIds)
    : { data: [] };
  const staffCountByEvent = new Map<string, number>();
  for (const r of eventStaffRows ?? []) {
    staffCountByEvent.set(
      r.event_id,
      (staffCountByEvent.get(r.event_id) ?? 0) + 1,
    );
  }

  // ─── Resolve client names for events + unpaid invoices ─────────
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

  // Products map for movement display
  const productIds = Array.from(
    new Set((recentMovements ?? []).map((m) => m.product_id)),
  );
  const { data: movementProducts } = productIds.length
    ? await supabase
        .from("products")
        .select("id,name")
        .in("id", productIds)
    : { data: [] };
  const productsMap = new Map(
    (movementProducts ?? []).map((p) => [p.id, p.name]),
  );

  // ─── Compute derived KPIs ──────────────────────────────────────
  // CA net d'avoirs pour le mois en cours (credit notes have negative totals).
  const caMonth = (monthInvoices ?? []).reduce(
    (s, i) => s + Number(i.total_ttc ?? 0),
    0,
  );

  // Remaining to collect across all unpaid invoices (excluding credit notes).
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
  const pendingQuotesCount = (pendingQuotes ?? []).length;

  const signedQuotesYearValue = (signedQuotesYear ?? []).reduce(
    (s, q) => s + Number(q.total_ttc ?? 0),
    0,
  );
  const signedQuotesYearCount = (signedQuotesYear ?? []).length;

  const overdueInvoices = invoicesWithRemaining.filter(
    (inv) => inv.due_date && inv.due_date < todayISO,
  );

  const lowStock = (lowStockProducts ?? []).filter(
    (p) => Number(p.stock_qty) <= Number(p.min_threshold ?? 0),
  );

  const eventsWithoutStaff = (upcomingEvents ?? []).filter(
    (e) => (staffCountByEvent.get(e.id) ?? 0) === 0,
  );

  const hasAlerts =
    overdueInvoices.length > 0 ||
    lowStock.length > 0 ||
    eventsWithoutStaff.length > 0;

  // Top-5 unpaid (sorted by due date, overdue first)
  const topUnpaid = invoicesWithRemaining.slice(0, 5);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-widest text-neutral-500">
          {new Date().toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h1 className="mt-1 font-display text-2xl text-white md:text-3xl">
          Tableau de bord
        </h1>
      </header>

      {/* ─── Hero KPIs ─── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-5">
        <HeroKpi
          label="CA du mois"
          value={formatEUR(caMonth)}
          icon={Euro}
          tone="ok"
          hint={`net d'avoirs · ${new Date().toLocaleDateString("fr-FR", { month: "long" })}`}
          href="/dashboard/factures"
        />
        <HeroKpi
          label="Reste à encaisser"
          value={formatEUR(totalRemaining)}
          icon={Receipt}
          tone={totalRemaining > 0 ? "pending" : "ok"}
          hint={`${invoicesWithRemaining.length} facture${invoicesWithRemaining.length > 1 ? "s" : ""} ouverte${invoicesWithRemaining.length > 1 ? "s" : ""}`}
          href="/dashboard/factures"
        />
        <HeroKpi
          label={`Devis signés ${today.getFullYear()}`}
          value={String(signedQuotesYearCount)}
          icon={FileCheck2}
          tone="ok"
          hint={signedQuotesYearValue > 0 ? formatEUR(signedQuotesYearValue) : "aucun signé cette année"}
          href="/dashboard/devis"
        />
        <HeroKpi
          label="Devis en attente"
          value={String(pendingQuotesCount)}
          icon={FileText}
          hint={pendingQuotesValue > 0 ? formatEUR(pendingQuotesValue) : "envoyés, en attente retour"}
          href="/dashboard/devis"
        />
        <HeroKpi
          label="Nouvelles demandes"
          value={String(leadsNew ?? 0)}
          icon={Inbox}
          tone={(leadsNew ?? 0) > 0 ? "pending" : undefined}
          hint="à contacter"
          href="/dashboard/leads"
        />
      </div>

      {/* ─── Alerts band ─── */}
      {hasAlerts && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-200">
              Points d&apos;attention
            </p>
            <ul className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-100/80">
              {overdueInvoices.length > 0 && (
                <li>
                  <Link
                    href="/dashboard/factures?kind=factures"
                    className="hover:text-white"
                  >
                    <strong className="text-amber-200">
                      {overdueInvoices.length}
                    </strong>{" "}
                    facture{overdueInvoices.length > 1 ? "s" : ""} en retard
                  </Link>
                </li>
              )}
              {eventsWithoutStaff.length > 0 && (
                <li>
                  <Link href="/dashboard/events" className="hover:text-white">
                    <strong className="text-amber-200">
                      {eventsWithoutStaff.length}
                    </strong>{" "}
                    événement{eventsWithoutStaff.length > 1 ? "s" : ""} sans staff (≤ 7j)
                  </Link>
                </li>
              )}
              {lowStock.length > 0 && (
                <li>
                  <Link href="/dashboard/stock" className="hover:text-white">
                    <strong className="text-amber-200">{lowStock.length}</strong>{" "}
                    produit{lowStock.length > 1 ? "s" : ""} sous seuil stock
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* ─── Two-column main body ─── */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Factures à encaisser */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Receipt className="h-3.5 w-3.5 text-neutral-500" />
                Factures à encaisser
              </h2>
              <p className="text-[11px] text-neutral-500">
                {invoicesWithRemaining.length} ouverte
                {invoicesWithRemaining.length > 1 ? "s" : ""} · {formatEUR(totalRemaining)}
              </p>
            </div>
            <Link
              href="/dashboard/factures"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {topUnpaid.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              Tout est à jour ✓
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {topUnpaid.map((inv) => {
                const paid = paidByInvoice.get(inv.id) ?? 0;
                const remaining =
                  Math.round((Number(inv.total_ttc) - paid) * 100) / 100;
                const overdue = inv.due_date && inv.due_date < todayISO;
                return (
                  <li
                    key={inv.id}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <Link
                      href={`/dashboard/factures/${inv.id}`}
                      className="min-w-0 flex-1"
                    >
                      <p className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-neutral-100">
                          {inv.number}
                        </span>
                        <span className="truncate text-xs text-neutral-500">
                          · {clientName(inv.client_id)}
                        </span>
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]">
                        <span
                          className={
                            overdue ? "text-red-300" : "text-neutral-500"
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
                          <span className="text-amber-500/70">
                            · {inv.reminder_count} relance
                            {(inv.reminder_count ?? 0) > 1 ? "s" : ""}
                          </span>
                        )}
                      </p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-sm font-medium ${overdue ? "text-red-300" : "text-amber-300"}`}
                      >
                        {formatEUR(remaining)}
                      </span>
                      <QuickRemindButton invoiceId={inv.id} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Prochains événements (7 jours) */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <CalendarDays className="h-3.5 w-3.5 text-neutral-500" />
                Prochains événements
              </h2>
              <p className="text-[11px] text-neutral-500">
                7 jours à venir · {(upcomingEvents ?? []).length} prévu
                {(upcomingEvents ?? []).length > 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/dashboard/events"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(upcomingEvents ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              Pas d&apos;événement prévu cette semaine.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {(upcomingEvents ?? []).map((ev) => {
                const staffCount = staffCountByEvent.get(ev.id) ?? 0;
                const noStaff = staffCount === 0 && ev.status !== "annule";
                return (
                  <li key={ev.id} className="py-2.5">
                    <Link
                      href={`/dashboard/events/${ev.id}`}
                      className="flex items-center gap-3"
                    >
                      <div className="shrink-0 inline-flex h-10 w-10 flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-900">
                        <span className="text-[9px] uppercase text-neutral-500">
                          {new Date(ev.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {new Date(ev.date).getDate()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                          {ev.title}
                          <StatusBadge status={ev.status} />
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                          {ev.start_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ev.start_time.slice(0, 5)}
                            </span>
                          )}
                          <span className="truncate">
                            {clientName(ev.client_id)}
                          </span>
                          {ev.guests_count && (
                            <span>· {ev.guests_count} pers.</span>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px]">
                        <div
                          className={`inline-flex items-center gap-1 ${
                            noStaff ? "text-amber-300" : "text-neutral-400"
                          }`}
                        >
                          <Users className="h-3 w-3" />
                          {staffCount}
                        </div>
                        {noStaff && (
                          <p className="text-[10px] text-amber-400/70">
                            à staffer
                          </p>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ─── Activity feeds: leads + movements ─── */}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {/* Demandes récentes */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Inbox className="h-3.5 w-3.5 text-neutral-500" />
              Demandes récentes
            </h2>
            <Link
              href="/dashboard/leads"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(recentLeads ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              Aucune demande pour l&apos;instant.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {(recentLeads ?? []).map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/dashboard/leads/${l.id}`}
                    className="flex items-center gap-3 py-2.5 transition-colors hover:opacity-90"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-100">
                        {l.contact_name || l.contact_email || "Sans nom"}
                      </p>
                      <p className="flex items-center gap-2 text-[11px] text-neutral-500">
                        <span>
                          {formatDateFR(l.created_at, { withTime: true })}
                        </span>
                        <EventTypeLabel value={l.event_type} />
                      </p>
                    </div>
                    <StatusBadge status={l.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mouvements stock */}
        <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Package className="h-3.5 w-3.5 text-neutral-500" />
              Mouvements stock récents
            </h2>
            <Link
              href="/dashboard/stock"
              className="inline-flex items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-white"
            >
              Tout voir <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {(recentMovements ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-500">
              Pas de mouvement pour l&apos;instant.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-900">
              {(recentMovements ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  {m.direction === "in" ? (
                    <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <ArrowDownCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                  <span className="flex-1 truncate text-sm text-neutral-100">
                    {productsMap.get(m.product_id) ?? "—"}
                  </span>
                  <span
                    className={`text-sm font-medium ${m.direction === "in" ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {m.direction === "in" ? "+" : "−"}
                    {Number(m.qty)}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    {formatDateFR(m.created_at, { withTime: true })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ─── Quick actions ─── */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-400">
          <Zap className="h-3.5 w-3.5" /> Accès rapide
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <QuickCard
            href="/dashboard/clients"
            title="Ouvrir un client"
            desc="Fiche 360° : CA cumulé, historique devis/factures, nouveau devis pré-rempli."
          />
          <QuickCard
            href="/dashboard/devis"
            title="Créer un devis"
            desc="Plaquette éditoriale + envoi email Resend, workflow brouillon → accepté → facture."
          />
          <QuickCard
            href="/dashboard/events"
            title="Planifier un événement"
            desc="Staff, stock réservé, clôture = mouvements OUT automatiques."
          />
        </div>
      </section>
    </div>
  );
}

function HeroKpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  href,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "pending";
  hint?: string;
  href: string;
}) {
  const valueCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "pending"
      ? "text-amber-300"
      : "text-white";
  return (
    <Link
      href={href}
      className="group rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-neutral-600 transition-colors group-hover:text-neutral-400" />
      </div>
      <p
        className={`mt-3 font-display text-2xl md:text-3xl leading-tight ${valueCls}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 truncate text-[11px] text-neutral-500">{hint}</p>
      )}
    </Link>
  );
}

function QuickCard({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-5 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{desc}</p>
    </Link>
  );
}
