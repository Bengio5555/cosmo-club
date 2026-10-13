"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMotionValueEvent, useSpring } from "motion/react";
import { formatEUR } from "@/lib/format";
import { REVENUE_TYPES, REVENUE_TYPE_LABEL, type EventType, type RevenuePoint } from "@/lib/dashboard/revenue";
import { cn } from "@/lib/utils";

/**
 * CA sur 6 mois, en colonnes empilées par type d'événement.
 *
 * - Survol (ou doigt posé) sur un mois : la colonne s'allume, une ligne de
 *   repère traverse le graphique au niveau du total, le chiffre d'en-tête
 *   glisse vers la nouvelle valeur, et la répartition mariage / corporate /
 *   … s'affiche dans l'info-bulle et dans la rangée de légende en dessous.
 * - Sans survol : le mois courant (dernière colonne) est sélectionné.
 *
 * Palette catégorielle validée (dataviz skill) : ordre fixe par type, pas de
 * couleur par rang. Segments séparés par un liseré de 2 px couleur surface.
 */

// Validated categorical slots (light / dark), one per event type, in the
// fixed order of REVENUE_TYPES. « autre » is a neutral : it is the
// remainder, not a series of its own.
const SWATCH: Record<EventType, string> = {
  mariage: "bg-[#2a78d6] dark:bg-[#3987e5]",
  corporate: "bg-[#eb6834] dark:bg-[#d95926]",
  prive: "bg-[#1baf7a] dark:bg-[#199e70]",
  defile: "bg-[#eda100] dark:bg-[#c98500]",
  lancement: "bg-[#e87ba4] dark:bg-[#d55181]",
  autre: "bg-slate-400 dark:bg-slate-500",
};

const MONTH_LONG: Record<string, string> = {
  "janv.": "janvier", "févr.": "février", mars: "mars", "avr.": "avril", mai: "mai", juin: "juin",
  "juil.": "juillet", août: "août", "sept.": "septembre", "oct.": "octobre", "nov.": "novembre", "déc.": "décembre",
};

/** Clean ceiling for the axis : 1 / 2 / 2,5 / 5 × 10^n above the max. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
const compact = (v: number) =>
  v >= 1000 ? `${(v / 1000).toLocaleString("fr-FR", { maximumFractionDigits: v % 1000 === 0 ? 0 : 1 })} k€` : `${v} €`;

export function RevenueChart({ series }: { series: RevenuePoint[] }) {
  const n = series.length;
  const last = Math.max(0, n - 1);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover ?? last;
  const point = series[active];

  const ceil = useMemo(() => niceCeil(Math.max(1, ...series.map((p) => p.total))), [series]);
  // Only the types that earned something over the period make the legend.
  const presentTypes = useMemo(
    () => REVENUE_TYPES.filter((t) => series.some((p) => p.byType[t] > 0)),
    [series],
  );

  // The headline glides between months instead of jumping.
  const spring = useSpring(point?.total ?? 0, { stiffness: 120, damping: 22 });
  const [shown, setShown] = useState(point?.total ?? 0);
  useEffect(() => { spring.set(point?.total ?? 0); }, [point?.total, spring]);
  useMotionValueEvent(spring, "change", (v) => setShown(Math.round(v)));

  const plotRef = useRef<HTMLDivElement>(null);
  function pick(clientX: number) {
    const el = plotRef.current;
    if (!el || n === 0) return;
    const r = el.getBoundingClientRect();
    const ratio = Math.min(0.999, Math.max(0, (clientX - r.left) / r.width));
    setHover(Math.floor(ratio * n));
  }

  if (n === 0 || !point) return null;
  const pctOf = (v: number) => `${(v / ceil) * 100}%`;
  const monthLong = MONTH_LONG[point.month] ?? point.month;

  return (
    <div className="mt-4 select-none">
      {/* ── Headline : the active month and its total ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            CA HT · {monthLong}
          </p>
          <p className="mt-0.5 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {formatEUR(shown)}
          </p>
        </div>
        <p className={cn("hidden text-right text-[11px] text-slate-400 transition-opacity sm:block dark:text-slate-500", hover !== null && "opacity-0")}>
          Survolez un mois pour la répartition
        </p>
      </div>

      {/* ── Plot ── */}
      <div className="relative mt-4 pl-12">
        {/* axis ticks : 0 / half / ceiling */}
        {[0, 0.5, 1].map((f) => (
          <span
            key={f}
            className="absolute left-0 -translate-y-1/2 text-[10px] tabular-nums text-slate-400 dark:text-slate-500"
            style={{ top: `${(1 - f) * 100}%` }}
          >
            {compact(ceil * f)}
          </span>
        ))}
        {/* hairline grid */}
        {[0, 0.5, 1].map((f) => (
          <span
            key={`g${f}`}
            aria-hidden
            className="pointer-events-none absolute left-12 right-0 h-px bg-slate-200 dark:bg-slate-800"
            style={{ top: `${(1 - f) * 100}%` }}
          />
        ))}

        <div
          ref={plotRef}
          role="img"
          aria-label={`Chiffre d'affaires HT par mois et par type d'événement : ${series
            .map((p) => `${p.month} ${formatEUR(p.total)}`)
            .join(", ")}`}
          className="relative flex h-44 touch-pan-y items-end sm:h-52"
          onPointerDown={(e) => pick(e.clientX)}
          onPointerMove={(e) => { if (e.pointerType === "mouse" || e.buttons > 0) pick(e.clientX); }}
          onPointerLeave={() => setHover(null)}
        >
          {/* trace line at the active total */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 z-10 transition-[top] duration-300 ease-out"
            style={{ top: `${(1 - point.total / ceil) * 100}%` }}
          >
            <span className="absolute inset-x-0 top-0 border-t border-dashed border-slate-500/70 dark:border-slate-400/70" />
            <span className="absolute -left-12 top-0 -translate-y-1/2 rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white dark:bg-slate-100 dark:text-slate-900">
              {compact(Math.round(point.total))}
            </span>
            <span className="absolute right-0 top-0 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-slate-700 dark:bg-slate-200" />
          </div>

          {series.map((p, i) => {
            const isActive = i === active;
            // stack from the baseline up, in the fixed type order
            let acc = 0;
            const segments = REVENUE_TYPES.filter((t) => p.byType[t] > 0).map((t) => {
              const seg = { type: t, from: acc, to: acc + p.byType[t] };
              acc = seg.to;
              return seg;
            });
            return (
              <div key={p.month} className="relative flex h-full flex-1 items-end justify-center">
                <div className="relative h-full w-6">
                  {segments.map((seg, k) => (
                    <span
                      key={seg.type}
                      className={cn(
                        "absolute inset-x-0 transition-opacity duration-200",
                        SWATCH[seg.type],
                        k === segments.length - 1 && "rounded-t",
                        // 2 px surface gap between stacked segments
                        k > 0 && "border-t-2 border-white dark:border-slate-900",
                        hover !== null && !isActive && "opacity-35",
                      )}
                      style={{ bottom: pctOf(seg.from), height: pctOf(seg.to - seg.from) }}
                    />
                  ))}
                  {p.total === 0 && (
                    <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded bg-slate-300 dark:bg-slate-700" />
                  )}
                </div>

                {/* tooltip : the split of the hovered month */}
                {hover === i && (
                  <div
                    className={cn(
                      "pointer-events-none absolute bottom-full z-20 mb-2 w-max min-w-[11rem] rounded-md bg-slate-900 px-3 py-2 text-left text-[11px] text-white shadow-lg dark:bg-slate-800",
                      i === 0 ? "left-0" : i === n - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                    )}
                  >
                    <p className="flex items-baseline justify-between gap-4">
                      <span className="font-medium capitalize text-slate-300">{MONTH_LONG[p.month] ?? p.month}</span>
                      <span className="font-semibold tabular-nums">{formatEUR(p.total)}</span>
                    </p>
                    {p.total > 0 && (
                      <ul className="mt-1.5 space-y-0.5 border-t border-white/10 pt-1.5">
                        {REVENUE_TYPES.filter((t) => p.byType[t] > 0).map((t) => (
                          <li key={t} className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <span className={cn("inline-block h-2 w-2 rounded-sm", SWATCH[t])} />
                              {REVENUE_TYPE_LABEL[t]}
                            </span>
                            <span className="tabular-nums">
                              {formatEUR(p.byType[t])}
                              <span className="ml-1 text-slate-400">{Math.round((p.byType[t] / p.total) * 100)}%</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* month labels */}
        <div className="mt-2 flex">
          {series.map((p, i) => (
            <span
              key={p.month}
              className={cn(
                "flex-1 text-center text-[11px] font-medium capitalize",
                i === active ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400",
              )}
            >
              {p.month}
            </span>
          ))}
        </div>
      </div>

      {/* ── Legend + split of the active month ── */}
      {presentTypes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          {presentTypes.map((t) => {
            const v = point.byType[t];
            return (
              <li key={t} className="flex items-center gap-2">
                <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", SWATCH[t])} />
                <span className="text-slate-600 dark:text-slate-300">{REVENUE_TYPE_LABEL[t]}</span>
                <span className={cn("tabular-nums", v > 0 ? "font-semibold text-slate-900 dark:text-slate-100" : "text-slate-400 dark:text-slate-600")}>
                  {v > 0 ? formatEUR(v) : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
