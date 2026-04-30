import "server-only";

/**
 * Minimal iCalendar (RFC 5545) generator. Only what we need to expose
 * the events table to Google Calendar / Apple Calendar / Outlook.
 *
 * - Datetimes are emitted in UTC (Z suffix) — universal, avoids
 *   shipping a VTIMEZONE block.
 * - Lines are folded at 75 octets per spec to keep strict parsers
 *   happy (most are lenient, but Google was historically picky).
 * - Cancelled events are emitted with STATUS:CANCELLED so Google
 *   removes them from the subscribed view.
 */

export type IcsEvent = {
  uid: string;
  title: string;
  start: Date;
  end?: Date | null;
  location?: string | null;
  description?: string | null;
  status?: "CONFIRMED" | "TENTATIVE" | "CANCELLED";
  url?: string | null;
  lastModified?: Date | null;
};

const CRLF = "\r\n";

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/** Format a Date as a UTC iCal date-time, e.g. 20260430T193000Z. */
function fmtUtc(d: Date): string {
  return (
    d.getUTCFullYear().toString() +
    pad2(d.getUTCMonth() + 1) +
    pad2(d.getUTCDate()) +
    "T" +
    pad2(d.getUTCHours()) +
    pad2(d.getUTCMinutes()) +
    pad2(d.getUTCSeconds()) +
    "Z"
  );
}

/** Escape per RFC 5545 §3.3.11 (TEXT type). */
function escapeText(raw: string): string {
  return raw
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Fold long content lines at 75 octets. The continuation marker is a
 * CRLF followed by a single space — strict parsers reject lines that
 * exceed the limit.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  out.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    out.push(" " + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return out.join(CRLF);
}

function line(name: string, value: string): string {
  return fold(`${name}:${value}`);
}

export function buildIcs(opts: {
  calendarName: string;
  events: IcsEvent[];
  prodId?: string;
}): string {
  const prodId = opts.prodId ?? "-//Cosmo Club//Events//FR";
  const now = fmtUtc(new Date());

  const parts: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${prodId}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    line("X-WR-CALNAME", opts.calendarName),
    line("X-WR-TIMEZONE", "Europe/Paris"),
  ];

  for (const ev of opts.events) {
    parts.push("BEGIN:VEVENT");
    parts.push(line("UID", ev.uid));
    parts.push(line("DTSTAMP", now));
    parts.push(line("DTSTART", fmtUtc(ev.start)));
    if (ev.end) parts.push(line("DTEND", fmtUtc(ev.end)));
    parts.push(line("SUMMARY", escapeText(ev.title)));
    if (ev.location) parts.push(line("LOCATION", escapeText(ev.location)));
    if (ev.description)
      parts.push(line("DESCRIPTION", escapeText(ev.description)));
    if (ev.url) parts.push(line("URL", ev.url));
    parts.push(line("STATUS", ev.status ?? "CONFIRMED"));
    if (ev.lastModified)
      parts.push(line("LAST-MODIFIED", fmtUtc(ev.lastModified)));
    parts.push("END:VEVENT");
  }

  parts.push("END:VCALENDAR");
  return parts.join(CRLF) + CRLF;
}

/**
 * Combine an event row's date (YYYY-MM-DD), start_time (HH:MM:SS|null)
 * and end_time into Date objects, treating the input as
 * Europe/Paris-local. We don't ship the tzdata for full DST handling —
 * we approximate by using JavaScript's Date constructor on a string
 * with the offset omitted, which Node interprets as the server's TZ.
 * Vercel is set to UTC, so we manually shift +1h (CET) / +2h (CEST)
 * via a small DST predicate. Good enough for a single-region calendar.
 */
export function combineEventDateTime(
  date: string,
  time: string | null,
  fallback: { hour: number; minute: number },
): Date {
  // date is YYYY-MM-DD; time is HH:MM[:SS] or null
  const [yyyy, mm, dd] = date.slice(0, 10).split("-").map(Number);
  let h = fallback.hour;
  let m = fallback.minute;
  if (time) {
    const parts = time.split(":");
    h = Number(parts[0] ?? 0);
    m = Number(parts[1] ?? 0);
  }

  // Approximate Paris UTC offset: +2h during CEST (last Sun of March
  // through last Sun of October), +1h otherwise. Drift on switch days
  // is acceptable for a calendar feed — events near 02:00 are rare.
  const offsetHours = isParisDst(yyyy, mm, dd) ? 2 : 1;
  return new Date(Date.UTC(yyyy, mm - 1, dd, h - offsetHours, m, 0));
}

function isParisDst(year: number, month: number, day: number): boolean {
  // CEST runs from last Sunday of March to last Sunday of October.
  if (month < 3 || month > 10) return false;
  if (month > 3 && month < 10) return true;
  const lastSunday = lastSundayOfMonth(year, month);
  if (month === 3) return day >= lastSunday;
  return day < lastSunday;
}

function lastSundayOfMonth(year: number, month: number): number {
  // Find the last day of the month, then walk back to the nearest Sunday.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDow = new Date(Date.UTC(year, month - 1, lastDay)).getUTCDay();
  return lastDay - lastDow;
}
