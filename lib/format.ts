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
