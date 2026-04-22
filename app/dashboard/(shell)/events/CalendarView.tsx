import Link from "next/link";
import type { Database } from "@/types/database";

type EventStatus = Database["public"]["Enums"]["event_status"];
type EventCell = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  start_time: string | null;
  status: EventStatus;
};

/**
 * Month-grid calendar for events.
 *
 * We always start the grid on a Monday (FR convention) and stop on a
 * Sunday, so the visible range is usually 35 or 42 days. The parent
 * query must cover that whole range — not just the active month —
 * because events from the previous/next month that "bleed into" the
 * grid should still render.
 *
 * Pills are colored by status:
 *   a_venir   → sky
 *   en_cours  → amber
 *   termine   → emerald
 *   annule    → neutral (strikethrough)
 */
export function CalendarView({
  monthDate,
  events,
}: {
  monthDate: Date;
  events: EventCell[];
}) {
  const days = buildMonthGrid(monthDate);
  const today = new Date().toISOString().slice(0, 10);
  const activeMonth = monthDate.getMonth();

  // Group events by YYYY-MM-DD key
  const byDay = new Map<string, EventCell[]>();
  for (const e of events) {
    const arr = byDay.get(e.date) ?? [];
    arr.push(e);
    byDay.set(e.date, arr);
  }
  // Sort each day's events by start_time
  for (const arr of byDay.values()) {
    arr.sort((a, b) =>
      (a.start_time ?? "").localeCompare(b.start_time ?? ""),
    );
  }

  const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-neutral-900 bg-neutral-950/80 text-[10px] uppercase tracking-wide text-neutral-500">
        {weekdays.map((w) => (
          <div
            key={w}
            className="border-r border-neutral-900 px-2 py-2 text-center last:border-r-0"
          >
            {w}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const key = d.key;
          const dayEvents = byDay.get(key) ?? [];
          const isToday = key === today;
          const isCurrentMonth = d.date.getMonth() === activeMonth;
          const visible = dayEvents.slice(0, 3);
          const hidden = dayEvents.length - visible.length;

          return (
            <div
              key={key}
              className={`relative min-h-[96px] border-b border-r border-neutral-900 p-1.5 transition-colors [&:nth-child(7n)]:border-r-0 ${
                isCurrentMonth ? "bg-neutral-950/60" : "bg-neutral-950/30"
              } ${dayEvents.length > 0 ? "hover:bg-neutral-900" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full text-[11px] font-semibold ${
                    isToday
                      ? "bg-[color:var(--color-grenat)] text-[color:var(--color-bone)] px-1.5"
                      : isCurrentMonth
                      ? "text-neutral-200"
                      : "text-neutral-600"
                  }`}
                >
                  {d.date.getDate()}
                </span>
                {dayEvents.length > 0 && isCurrentMonth && (
                  <span className="text-[9px] text-neutral-500">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <ul className="space-y-1">
                {visible.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/dashboard/events/${e.id}`}
                      className={`block truncate rounded px-1.5 py-0.5 text-[10px] transition-opacity hover:opacity-90 ${pillCls(e.status)} ${e.status === "annule" ? "line-through" : ""}`}
                      title={`${e.title}${e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}`}
                    >
                      {e.start_time && (
                        <span className="mr-1 font-medium opacity-80">
                          {e.start_time.slice(0, 5)}
                        </span>
                      )}
                      {e.title}
                    </Link>
                  </li>
                ))}
                {hidden > 0 && (
                  <li className="px-1.5 text-[10px] text-neutral-500">
                    +{hidden} autre{hidden > 1 ? "s" : ""}
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function pillCls(status: EventStatus): string {
  switch (status) {
    case "a_venir":
      return "bg-sky-500/15 text-sky-200 border border-sky-500/30";
    case "en_cours":
      return "bg-amber-500/15 text-amber-100 border border-amber-500/40";
    case "termine":
      return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30";
    case "annule":
      return "bg-neutral-800 text-neutral-500 border border-neutral-700";
  }
}

/**
 * Return the 35/42-day grid covering `monthDate`.
 * Starts on the Monday on or before the 1st of the month.
 * Ends on the Sunday on or after the last day of the month.
 */
export function buildMonthGrid(monthDate: Date) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const lastOfMonth = new Date(y, m + 1, 0);

  // getDay() returns 0=Sun..6=Sat. Convert to 0=Mon..6=Sun.
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7;
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7;

  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstWeekday);

  const end = new Date(lastOfMonth);
  end.setDate(lastOfMonth.getDate() + (6 - lastWeekday));

  const days: { date: Date; key: string }[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push({
      date: new Date(cur),
      key: isoKey(cur),
    });
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

/** Returns YYYY-MM-DD for the first/last day of the provided grid range. */
export function gridRange(monthDate: Date): { from: string; to: string } {
  const days = buildMonthGrid(monthDate);
  return { from: days[0].key, to: days[days.length - 1].key };
}
