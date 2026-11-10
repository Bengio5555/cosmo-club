import Link from "next/link";
import { CalendarDays, ScanLine } from "lucide-react";
import type { EventEquipmentProgress } from "@/lib/equipment/whereabouts";
import { formatDateFR } from "@/lib/format";

/**
 * Événements en cours / à venir qui ont du matériel affecté, avec
 * l'avancement des scans : chargé au stock, revenu au camion.
 */
export function EventsProgress({ progress }: { progress: EventEquipmentProgress[] }) {
  if (progress.length === 0) return null;
  return (
    <section className="mb-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        Matériel sur les événements en cours et à venir
      </p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {progress.map((p) => {
          const live = p.event.status === "en_cours";
          const allOut = p.charges === p.total;
          const allBack = p.revenus === p.total;
          return (
            <li
              key={p.event.id}
              className={`rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950/60 dark:shadow-none ${
                live ? "border-sky-300 dark:border-sky-800" : "border-slate-200 dark:border-slate-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/events/${p.event.id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                  >
                    {p.event.title}
                  </Link>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <CalendarDays className="h-3 w-3" />
                    {formatDateFR(p.event.date)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    live
                      ? "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200"
                      : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  }`}
                >
                  {live ? "En cours" : "À venir"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <Step label="Chargé" done={p.charges} total={p.total} complete={allOut} />
                <Step label="Revenu" done={p.revenus} total={p.total} complete={allBack} />
              </div>
              <Link
                href={`/dashboard/events/${p.event.id}#materiel`}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <ScanLine className="h-3 w-3" /> Voir le détail et scanner
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Step({ label, done, total, complete }: { label: string; done: number; total: number; complete: boolean }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500">{label}</span>
        <span className={`tabular-nums font-medium ${complete ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"}`}>
          {done}/{total}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full ${complete ? "bg-emerald-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
