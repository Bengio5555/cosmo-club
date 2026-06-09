const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateFR(
  value: string | Date | null | undefined,
  opts?: { withTime?: boolean; fallback?: string },
): string {
  if (!value) return opts?.fallback ?? "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return opts?.fallback ?? "—";
  return (opts?.withTime ? dateTimeFmt : dateFmt).format(d);
}

/**
 * Render an event date as either a single day or a "du X au Y" range
 * for multi-day events. When `end` is null, equal to `start`, or
 * invalid, falls back to a plain single-date render (so existing
 * single-day events look exactly as before). The leading "du …" prefix
 * is omitted when `prefixed` is false (handy when the label already
 * says "Date").
 */
export function formatDateRangeFR(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  opts?: { prefixed?: boolean; fallback?: string },
): string {
  if (!start) return opts?.fallback ?? "—";
  const startStr = formatDateFR(start, { fallback: opts?.fallback ?? "—" });
  // Normalize to YYYY-MM-DD for the equality check so a date and a
  // timestamptz pointing at the same day don't render as a range.
  const dayKey = (v: string | Date) =>
    (v instanceof Date ? v.toISOString() : String(v)).slice(0, 10);
  if (!end || dayKey(end) === dayKey(start)) return startStr;
  const endStr = formatDateFR(end, { fallback: "" });
  if (!endStr || endStr === "—") return startStr;
  const prefix = opts?.prefixed === false ? "" : "Du ";
  const middle = opts?.prefixed === false ? " – " : " au ";
  return `${prefix}${startStr}${middle}${endStr}`;
}

const eurFmt = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

export function formatEUR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return eurFmt.format(value);
}

/**
 * Same as formatEUR but safe for embedding in PDF fonts that don't ship
 * U+202F (NARROW NO-BREAK SPACE) or U+00A0 (NO-BREAK SPACE) glyphs —
 * notably Helvetica as packaged in @react-pdf/renderer, which would
 * otherwise render those bytes as a stray "/" or square. Collapses both
 * to a regular ASCII space.
 */
export function formatEURPdfSafe(value: number | null | undefined): string {
  return formatEUR(value).replace(/[  ]/g, " ");
}
