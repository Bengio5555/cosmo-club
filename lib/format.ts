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
