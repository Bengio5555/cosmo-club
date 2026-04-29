import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  Wine,
  Package,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { NewEventButton } from "./NewEventButton";
import { CalendarView, gridRange } from "./CalendarView";
import { autoStartDueEvents } from "./actions";

type SP = Promise<{
  view?: string;
  when?: string;
  status?: string;
  m?: string;
}>;

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const params = await searchParams;
  const view = params.view === "calendar" ? "calendar" : "list";

  return view === "calendar" ? (
    <CalendarPage monthParam={params.m} />
  ) : (
    <ListPage when={params.when} status={params.status} />
  );
}

/* ─── Shared view switcher ───────────────────────────────────────── */

function ViewSwitcher({ currentView }: { currentView: "list" | "calendar" }) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors";
  return (
    <div className="inline-flex gap-1 rounded-lg border border-neutral-800 bg-neutral-950/80 p-1 text-xs">
      <Link
        href="/dashboard/events?view=list"
        className={`${base} ${currentView === "list" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
      >
        <List className="h-3 w-3" /> Liste
      </Link>
      <Link
        href="/dashboard/events?view=calendar"
        className={`${base} ${currentView === "calendar" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"}`}
      >
        <LayoutGrid className="h-3 w-3" /> Calendrier
      </Link>
    </div>
  );
}

/* ─── Calendar view ──────────────────────────────────────────────── */

async function CalendarPage({ monthParam }: { monthParam?: string }) {
  await autoStartDueEvents();
  const supabase = await createClient();

  // Parse or fall back to current month.
  const monthDate = parseMonthParam(monthParam);
  const { from, to } = gridRange(monthDate);

  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,date,start_time,status")
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  const prev = shiftMonth(monthDate, -1);
  const next = shiftMonth(monthDate, 1);
  const todayMonth = new Date();
  const isCurrentMonth =
    monthDate.getFullYear() === todayMonth.getFullYear() &&
    monthDate.getMonth() === todayMonth.getMonth();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Événements
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Vue mensuelle — clique sur un événement pour ouvrir sa fiche.
          </p>
        </div>
        <NewEventButton />
      </header>

      <div className="mb-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <ViewSwitcher currentView="calendar" />
        <div className="inline-flex items-center gap-2">
          <Link
            href={`/dashboard/events?view=calendar&m=${monthKey(prev)}`}
            className="rounded-md border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
            aria-label="Mois précédent"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <p className="min-w-[160px] text-center font-display text-lg text-white capitalize">
            {monthDate.toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <Link
            href={`/dashboard/events?view=calendar&m=${monthKey(next)}`}
            className="rounded-md border border-neutral-800 bg-neutral-900 p-1.5 text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
            aria-label="Mois suivant"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
          {!isCurrentMonth && (
            <Link
              href="/dashboard/events?view=calendar"
              className="ml-1 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 transition-colors hover:border-neutral-700"
            >
              Aujourd&apos;hui
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <CalendarView monthDate={monthDate} events={events ?? []} />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-500">
        <LegendDot cls="bg-sky-500/15 border border-sky-500/30" label="À venir" />
        <LegendDot cls="bg-amber-500/15 border border-amber-500/40" label="En cours" />
        <LegendDot cls="bg-emerald-500/15 border border-emerald-500/30" label="Terminé" />
        <LegendDot cls="bg-neutral-800 border border-neutral-700" label="Annulé" />
      </div>
    </div>
  );
}

function LegendDot({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2.5 w-2.5 rounded-sm ${cls}`} />
      {label}
    </span>
  );
}

function parseMonthParam(raw: string | undefined): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function monthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function shiftMonth(d: Date, delta: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

/* ─── List view (existing) ───────────────────────────────────────── */

async function ListPage({ when, status }: { when?: string; status?: string }) {
  const whenEffective = when ?? "upcoming";
  // Auto-start any overdue events before we render — keeps the list in
  // sync with reality without needing a cron job.
  await autoStartDueEvents();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,guests_count,status,client_id,quote_id",
    )
    .limit(500);

  if (whenEffective === "upcoming") {
    q = q.gte("date", today).order("date", { ascending: true });
  } else if (whenEffective === "past") {
    q = q.lt("date", today).order("date", { ascending: false });
  } else {
    q = q.order("date", { ascending: false });
  }
  if (status)
    q = q.eq(
      "status",
      status as "a_venir" | "en_cours" | "termine" | "annule",
    );

  const { data: events, error } = await q;

  const clientIds = Array.from(
    new Set(
      (events ?? []).map((e) => e.client_id).filter((x): x is string => !!x),
    ),
  );
  const eventIds = (events ?? []).map((e) => e.id);
  const [
    { data: eventStaffRows },
    { data: eventCocktailRows },
    { data: eventStockRows },
    { data: clientRows },
  ] = await Promise.all([
    eventIds.length
      ? supabase
          .from("event_staff")
          .select("event_id,staff_id")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from("event_cocktails")
          .select("event_id")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from("event_stock")
          .select("event_id")
          .in("event_id", eventIds)
      : Promise.resolve({ data: [] }),
    clientIds.length
      ? supabase
          .from("clients")
          .select("id,first_name,last_name,company_name,email")
          .in("id", clientIds)
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
  const clientsMap = new Map((clientRows ?? []).map((c) => [c.id, c]));

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">
            Événements
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Pilotage opérationnel : briefings, staff assigné, stock réservé,
            clôture → mouvements OUT automatiques.
          </p>
        </div>
        <NewEventButton />
      </header>

      <div className="mb-4 flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
        <ViewSwitcher currentView="list" />
        <div className="flex flex-wrap gap-1 rounded-xl border border-neutral-800 bg-neutral-950/60 p-1 text-xs">
          <FilterLink currentWhen={whenEffective} value="upcoming" label="À venir" />
          <FilterLink currentWhen={whenEffective} value="past" label="Passés" />
          <FilterLink currentWhen={whenEffective} value="all" label="Tous" />
          <div className="mx-1 w-px bg-neutral-800" />
          <FilterLink
            currentStatus={status}
            value={undefined}
            label="Tous statuts"
            pKey="status"
          />
          <FilterLink
            currentStatus={status}
            value="a_venir"
            label="À venir"
            pKey="status"
          />
          <FilterLink
            currentStatus={status}
            value="en_cours"
            label="En cours"
            pKey="status"
          />
          <FilterLink
            currentStatus={status}
            value="termine"
            label="Terminés"
            pKey="status"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
        {events && events.length > 0 ? (
          <ul className="divide-y divide-neutral-900">
            {events.map((ev) => {
              const client = ev.client_id ? clientsMap.get(ev.client_id) : null;
              const clientName =
                client?.company_name ||
                [client?.first_name, client?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                client?.email ||
                "—";
              const staffCount = staffCountByEvent.get(ev.id) ?? 0;
              const cocktailCount = cocktailCountByEvent.get(ev.id) ?? 0;
              const stockCount = stockCountByEvent.get(ev.id) ?? 0;
              const daysUntil = Math.floor(
                (new Date(ev.date).getTime() - new Date(today).getTime()) /
                  86400000,
              );
              const stillActionable =
                ev.status !== "annule" &&
                ev.status !== "termine" &&
                daysUntil >= 0;
              const cocktailsDue =
                stillActionable && cocktailCount === 0 && daysUntil <= 15;
              const stockDue =
                stillActionable && stockCount === 0 && daysUntil <= 10;
              return (
                <li key={ev.id}>
                  <Link
                    href={`/dashboard/events/${ev.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-neutral-900 md:flex-row md:items-center md:gap-4 md:px-5"
                  >
                    <div className="shrink-0">
                      <div className="inline-flex h-12 w-12 flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-center">
                        <span className="text-[9px] uppercase text-neutral-500">
                          {new Date(ev.date).toLocaleDateString("fr-FR", {
                            month: "short",
                          })}
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {new Date(ev.date).getDate()}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-white">
                        {ev.title}
                        <StatusBadge status={ev.status} />
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateFR(ev.date)}
                          {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                          {ev.end_time && `–${ev.end_time.slice(0, 5)}`}
                        </span>
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {ev.location}
                          </span>
                        )}
                        {ev.guests_count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {ev.guests_count} pers.
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-4 text-right text-xs">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-neutral-600">
                          Client
                        </p>
                        <p className="text-neutral-200">{clientName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-neutral-600">
                          Staff
                        </p>
                        <p className="text-neutral-200">{staffCount}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-neutral-600">
                          Cocktails
                        </p>
                        <p
                          className={
                            cocktailsDue ? "text-amber-300" : "text-neutral-200"
                          }
                        >
                          {cocktailCount}
                        </p>
                        {cocktailsDue && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-400/80">
                            <Wine className="h-3 w-3" /> à prévoir
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-neutral-600">
                          Stock
                        </p>
                        <p
                          className={
                            stockDue ? "text-amber-300" : "text-neutral-200"
                          }
                        >
                          {stockCount}
                        </p>
                        {stockDue && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-amber-400/80">
                            <Package className="h-3 w-3" /> à réserver
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
            Aucun événement{" "}
            {whenEffective === "upcoming"
              ? "à venir"
              : whenEffective === "past"
                ? "passé"
                : ""}
            . Crée-en depuis un{" "}
            <Link
              href="/dashboard/devis"
              className="text-neutral-300 underline"
            >
              devis accepté
            </Link>{" "}
            ou clique « Nouvel événement ».
          </div>
        )}
      </div>
    </div>
  );
}

function FilterLink({
  currentWhen,
  currentStatus,
  value,
  label,
  pKey = "when",
}: {
  currentWhen?: string;
  currentStatus?: string;
  value: string | undefined;
  label: string;
  pKey?: "when" | "status";
}) {
  const isActive =
    pKey === "when"
      ? currentWhen === value || (!currentWhen && value === "upcoming")
      : (currentStatus ?? "") === (value ?? "");
  const qs = new URLSearchParams({ view: "list" });
  if (pKey === "when" && value && value !== "upcoming") qs.set("when", value);
  if (pKey === "status" && value) qs.set("status", value);
  // preserve the complementary filter
  if (pKey === "when" && currentStatus) qs.set("status", currentStatus);
  if (pKey === "status" && currentWhen && currentWhen !== "upcoming")
    qs.set("when", currentWhen);
  const href = `/dashboard/events?${qs}`;
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
        isActive
          ? "bg-[color:var(--color-grenat)]/20 text-[color:var(--color-grenat-glow)]"
          : "text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {label}
    </Link>
  );
}
