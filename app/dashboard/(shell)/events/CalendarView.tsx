"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, MapPin, Users, ChevronRight } from "lucide-react";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Enums"]["event_status"];
type EventCell = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time?: string | null;
  status: EventStatus;
  location?: string | null;
  guests_count?: number | null;
};

const STATUS_TONE: Record<EventStatus, string> = {
  a_venir:
    "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/30",
  en_cours:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/30",
  termine:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/30",
  annule:
    "bg-slate-100 text-slate-500 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
  annule: "Annulé",
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/**
 * Month-grid calendar with a side panel for the selected day. Inspired
 * by Linear/Notion calendar widgets — clicking a date opens a list of
 * its events on the right with full details (time, location, guests),
 * and each event card links to its detail page.
 *
 * Today is rendered as a slate-900 (dark) / slate-100 (light) filled
 * circle so it stands out without using the brand grenat colour.
 */
export function CalendarView({
  monthDate,
  events,
}: {
  monthDate: Date;
  events: EventCell[];
}) {
  const todayKey = isoKey(new Date());
  const monthFirstKey = isoKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  // Default selection: today if it's in the visible month, otherwise the
  // 1st of that month.
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    const today = new Date();
    if (
      today.getFullYear() === monthDate.getFullYear() &&
      today.getMonth() === monthDate.getMonth()
    ) {
      return todayKey;
    }
    return monthFirstKey;
  });

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);
  const activeMonth = monthDate.getMonth();

  // Group + sort events per day
  const byDay = useMemo(() => {
    const map = new Map<string, EventCell[]>();
    for (const e of events) {
      const arr = map.get(e.date) ?? [];
      arr.push(e);
      map.set(e.date, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) =>
        (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
    }
    return map;
  }, [events]);

  const selectedEvents = byDay.get(selectedKey) ?? [];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      {/* Month grid */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              {w}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const key = d.key;
            const dayEvents = byDay.get(key) ?? [];
            const isToday = key === todayKey;
            const isSelected = key === selectedKey;
            const inMonth = d.date.getMonth() === activeMonth;
            const visible = dayEvents.slice(0, 2);

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedKey(key)}
                className={
                  "flex min-h-[100px] flex-col items-stretch gap-1 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 " +
                  (i % 7 === 6 ? "border-r-0 " : "") +
                  (i >= days.length - 7 ? "border-b-0 " : "") +
                  (inMonth
                    ? ""
                    : "bg-slate-50/50 text-slate-400 dark:bg-slate-900/40 dark:text-slate-600 ") +
                  (isSelected
                    ? "ring-2 ring-inset ring-slate-900/30 dark:ring-slate-100/30 "
                    : "")
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className={
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums " +
                      (isToday
                        ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                        : inMonth
                          ? "text-slate-700 dark:text-slate-300"
                          : "text-slate-400 dark:text-slate-600")
                    }
                  >
                    {d.date.getDate()}
                  </span>
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                      +{dayEvents.length - 2}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 overflow-hidden">
                  {visible.map((e) => (
                    <div
                      key={e.id}
                      className={
                        "truncate rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
                        STATUS_TONE[e.status] +
                        (e.status === "annule" ? " line-through" : "")
                      }
                      title={e.title}
                    >
                      {e.start_time ? `${e.start_time.slice(0, 5)} · ` : ""}
                      {e.title}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Side panel — selected day details */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {new Date(selectedKey).toLocaleDateString("fr-FR", {
              weekday: "long",
            })}
          </p>
          <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {new Date(selectedKey).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
            })}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {selectedEvents.length} événement
            {selectedEvents.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun événement ce jour.
            </p>
          ) : (
            selectedEvents.map((e) => (
              <Link
                key={e.id}
                href={`/dashboard/events/${e.id}`}
                className="block rounded-md border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {e.title}
                  </p>
                  <span
                    className={
                      "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
                      STATUS_TONE[e.status]
                    }
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {(e.start_time || e.end_time) && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                      <span>
                        {e.start_time?.slice(0, 5) ?? "—"}
                        {e.end_time ? ` – ${e.end_time.slice(0, 5)}` : ""}
                      </span>
                    </div>
                  )}
                  {e.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{e.location}</span>
                    </div>
                  )}
                  {e.guests_count != null && (
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3 text-slate-400 dark:text-slate-500" />
                      <span>{e.guests_count} invités</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end text-[11px] text-slate-500 dark:text-slate-400">
                  Ouvrir la fiche
                  <ChevronRight className="h-3 w-3" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Grid utilities (kept identical for API compatibility) ─── */

export function buildMonthGrid(monthDate: Date) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const lastOfMonth = new Date(y, m + 1, 0);

  // 0=Sun..6=Sat → 0=Mon..6=Sun
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7;

  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstWeekday);

  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - lastWeekday));

  const days: { date: Date; key: string }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({ date: new Date(cur), key: isoKey(cur) });
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function gridRange(monthDate: Date): { from: string; to: string } {
  const days = buildMonthGrid(monthDate);
  return { from: days[0].key, to: days[days.length - 1].key };
}
