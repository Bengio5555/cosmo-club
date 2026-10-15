/** Client-safe helpers shared by the Drive UI. */

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`;
}

/** "2026-11-12 – Mariage Dupont", safe for a Drive folder name. */
export function eventFolderName(date: string, title: string) {
  const clean = title.replace(/[\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim();
  return `${date} – ${clean || "Événement"}`.slice(0, 120);
}

export function thumbnailUrl(id: string, size: 400 | 1600 = 400) {
  return `/api/dashboard/drive/${id}/thumbnail?s=${size}`;
}

export function downloadUrl(id: string) {
  return `/api/dashboard/drive/${id}/download`;
}
