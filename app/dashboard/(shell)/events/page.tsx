import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR } from "@/lib/format";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { NewEventButton } from "./NewEventButton";

type SP = Promise<{ when?: string; status?: string }>;

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { when = "upcoming", status } = await searchParams;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  let q = supabase
    .from("events")
    .select(
      "id,title,date,start_time,end_time,location,guests_count,status,client_id,quote_id",
    )
    .limit(500);

  if (when === "upcoming") {
    q = q.gte("date", today).order("date", { ascending: true });
  } else if (when === "past") {
    q = q.lt("date", today).order("date", { ascending: false });
  } else {
    q = q.order("date", { ascending: false });
  }
  if (status) q = q.eq("status", status as "a_venir" | "en_cours" | "termine" | "annule");

  const { data: events, error } = await q;

  // Resolve clients + eagerly fetch staff/stock counts.
  const clientIds = Array.from(
    new Set(
      (events ?? []).map((e) => e.client_id).filter((x): x is string => !!x),
    ),
  );
  const eventIds = (events ?? []).map((e) => e.id);
  const [{ data: eventStaffRows }, { data: clientRows }] = await Promise.all([
    eventIds.length
      ? supabase
          .from("event_staff")
          .select("event_id,staff_id")
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
  const clientsMap = new Map((clientRows ?? []).map((c) => [c.id, c]));

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">Événements</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Pilotage opérationnel : briefings, staff assigné, stock réservé,
            clôture → mouvements OUT automatiques.
          </p>
        </div>
        <NewEventButton />
      </header>

      <div className="mb-4 flex flex-wrap gap-1 rounded-xl border border-neutral-800 bg-neutral-950/60 p-1 text-xs">
        <FilterLink currentWhen={when} value="upcoming" label="À venir" />
        <FilterLink currentWhen={when} value="past" label="Passés" />
        <FilterLink currentWhen={when} value="all" label="Tous" />
        <div className="mx-1 w-px bg-neutral-800" />
        <FilterLink currentStatus={status} value={undefined} label="Tous statuts" pKey="status" />
        <FilterLink currentStatus={status} value="a_venir" label="À venir" pKey="status" />
        <FilterLink currentStatus={status} value="en_cours" label="En cours" pKey="status" />
        <FilterLink currentStatus={status} value="termine" label="Terminés" pKey="status" />
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
                [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
                client?.email ||
                "—";
              const staffCount = staffCountByEvent.get(ev.id) ?? 0;
              return (
                <li key={ev.id}>
                  <Link
                    href={`/dashboard/events/${ev.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-neutral-900 md:flex-row md:items-center md:gap-4 md:px-5"
                  >
                    <div className="shrink-0">
                      <div className="inline-flex h-12 w-12 flex-col items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 text-center">
                        <span className="text-[9px] uppercase text-neutral-500">
                          {new Date(ev.date).toLocaleDateString("fr-FR", { month: "short" })}
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
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-neutral-500">
            Aucun événement {when === "upcoming" ? "à venir" : when === "past" ? "passé" : ""}. Crée-en depuis un{" "}
            <Link href="/dashboard/devis" className="text-neutral-300 underline">
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
  const qs = new URLSearchParams();
  if (pKey === "when" && value) qs.set("when", value);
  if (pKey === "status" && value) qs.set("status", value);
  const href = `/dashboard/events${qs.toString() ? `?${qs}` : ""}`;
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
