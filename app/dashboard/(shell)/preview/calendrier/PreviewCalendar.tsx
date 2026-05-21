"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Users,
  Clock,
} from "lucide-react";

type EventRow = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  status: string;
  guests_count: number | null;
  client_id: string | null;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const STATUS_TONE: Record<string, string> = {
  a_venir: "bg-blue-50 text-blue-700 ring-blue-600/20",
  en_cours: "bg-amber-50 text-amber-700 ring-amber-600/20",
  termine: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  brouillon: "bg-slate-100 text-slate-600 ring-slate-300/40",
};

const STATUS_LABEL: Record<string, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
  brouillon: "Brouillon",
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function PreviewCalendar({ events }: { events: EventRow[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string>(ymd(today));

  // Indexe les events par date YYYY-MM-DD pour O(1) lookup au render.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  // Construit la grille du mois affiché : 6 rangées × 7 jours, en
  // commençant lundi pour respecter le format FR.
  const grid = useMemo(() => {
    const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    // jsDay : 0 = dim, 1 = lun … On veut lun = 0 → décalage.
    const offset = (firstOfMonth.getDay() + 6) % 7;
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(firstOfMonth);
      d.setDate(1 - offset + i);
      cells.push({
        date: d,
        inMonth: d.getMonth() === cursor.getMonth(),
      });
    }
    return cells;
  }, [cursor]);

  function prev() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function next() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(ymd(today));
  }

  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const monthEventCount = (events ?? []).filter((e) =>
    e.date.startsWith(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
    ),
  ).length;

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Aperçu design · shadcn / Zenith style
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Calendrier
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()} ·{" "}
              {monthEventCount} événement{monthEventCount > 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
              Exporter ICS
            </button>
            <button className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              Nouvel événement
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={prev}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={next}
              className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-50"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={goToday}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Aujourd&apos;hui
            </button>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {["Mois", "Semaine", "Jour", "Liste"].map((v, i) => (
              <button
                key={v}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (i === 0
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Grid + side panel */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          {/* Month grid */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAY_LABELS.map((w) => (
                <div
                  key={w}
                  className="px-2 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-500"
                >
                  {w}
                </div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7">
              {grid.map((cell, i) => {
                const key = ymd(cell.date);
                const events = eventsByDay.get(key) ?? [];
                const isToday = key === ymd(today);
                const isSelected = key === selectedDate;
                const inMonth = cell.inMonth;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(key)}
                    className={
                      "flex min-h-[100px] flex-col items-stretch gap-1 border-b border-r border-slate-100 p-2 text-left transition-colors hover:bg-slate-50 " +
                      (i % 7 === 6 ? "border-r-0 " : "") +
                      (i >= 35 ? "border-b-0 " : "") +
                      (inMonth ? "" : "bg-slate-50/50 text-slate-400 ") +
                      (isSelected ? "ring-2 ring-inset ring-slate-900/30 " : "")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium tabular-nums " +
                          (isToday
                            ? "bg-slate-900 text-white"
                            : inMonth
                              ? "text-slate-700"
                              : "text-slate-400")
                        }
                      >
                        {cell.date.getDate()}
                      </span>
                      {events.length > 2 && (
                        <span className="text-[10px] font-medium text-slate-400">
                          +{events.length - 2}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {events.slice(0, 2).map((e) => {
                        const tone =
                          STATUS_TONE[e.status] ?? STATUS_TONE.brouillon;
                        return (
                          <div
                            key={e.id}
                            className={
                              "truncate rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
                              tone
                            }
                            title={e.title}
                          >
                            {e.start_time ? `${e.start_time.slice(0, 5)} · ` : ""}
                            {e.title}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel — selected day details */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="border-b border-slate-100 pb-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {new Date(selectedDate).toLocaleDateString("fr-FR", {
                  weekday: "long",
                })}
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {new Date(selectedDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                {selectedEvents.length} événement
                {selectedEvents.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Aucun événement ce jour. Cliquez sur{" "}
                  <span className="font-medium">+ Nouvel événement</span> pour
                  en programmer un.
                </p>
              ) : (
                selectedEvents.map((e) => {
                  const tone =
                    STATUS_TONE[e.status] ?? STATUS_TONE.brouillon;
                  return (
                    <div
                      key={e.id}
                      className="rounded-md border border-slate-200 p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{e.title}</p>
                        <span
                          className={
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset " +
                            tone
                          }
                        >
                          {STATUS_LABEL[e.status] ?? e.status}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-slate-600">
                        {(e.start_time || e.end_time) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>
                              {e.start_time?.slice(0, 5) ?? "—"}
                              {e.end_time ? ` – ${e.end_time.slice(0, 5)}` : ""}
                            </span>
                          </div>
                        )}
                        {e.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span>{e.location}</span>
                          </div>
                        )}
                        {e.guests_count != null && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3 w-3 text-slate-400" />
                            <span>{e.guests_count} invités</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
