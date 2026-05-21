/**
 * Pure date utilities for the events month calendar. Lives in its own
 * file with no "use client" directive so both the server-side page
 * (which uses gridRange() to build the Supabase query range) and the
 * client-side CalendarView (which uses buildMonthGrid() to render)
 * can import them.
 */

export function buildMonthGrid(monthDate: Date) {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const firstOfMonth = new Date(y, m, 1);
  const lastOfMonth = new Date(y, m + 1, 0);

  // 0=Sun..6=Sat → 0=Mon..6=Sun (FR convention)
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

export function isoKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function gridRange(monthDate: Date): { from: string; to: string } {
  const days = buildMonthGrid(monthDate);
  return { from: days[0].key, to: days[days.length - 1].key };
}
