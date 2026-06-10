"use client";

import { useState } from "react";
import { formatEUR } from "@/lib/format";

type Point = { month: string; total: number };

/**
 * 6-month revenue area chart — smooth emerald area, responsive height,
 * and touch/hover interactive: drag a finger (or hover) across the
 * chart to surface each month's CA in a tooltip, with the matching
 * point + a vertical guide highlighted.
 *
 * Layout: the SVG stretches to fill a fixed responsive height
 * (preserveAspectRatio="none") so the area has real presence on phones;
 * dots, labels and the tooltip are absolutely-positioned HTML overlays
 * placed by percentage so they stay crisp and undistorted.
 */
export function RevenueChart({ series, max }: { series: Point[]; max: number }) {
  const W = 620;
  const H = 210;
  const padX = 18;
  const padTop = 30;
  const padBottom = 8;
  const n = series.length;

  const [active, setActive] = useState<number | null>(null);

  const xs = series.map((_, i) =>
    n <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1),
  );
  const ys = series.map(
    (p) => padTop + (1 - p.total / max) * (H - padTop - padBottom),
  );

  const linePath = smoothPath(xs, ys);
  const areaPath =
    `${linePath} L ${xs[n - 1].toFixed(1)},${(H - padBottom).toFixed(1)}` +
    ` L ${xs[0].toFixed(1)},${(H - padBottom).toFixed(1)} Z`;
  const gridYs = [0, 0.5, 1].map((f) => padTop + f * (H - padTop - padBottom));
  const pct = (v: number, span: number) => `${(v / span) * 100}%`;

  // Map a pointer x (relative ratio 0..1 across the box) to a month
  // index — even columns, one per month.
  function pickIndex(clientX: number, rect: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.min(n - 1, Math.max(0, Math.round(ratio * (n - 1))));
  }
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setActive(pickIndex(e.clientX, rect));
  }

  return (
    <div className="mt-4">
      <div
        className="relative h-40 w-full touch-pan-y select-none sm:h-48 lg:h-52"
        onPointerDown={onMove}
        onPointerMove={(e) => {
          // Mouse: follow on hover. Touch: follow while pressed (a
          // pointermove without buttons on touch still tracks the drag).
          if (e.pointerType !== "mouse" || e.buttons > 0 || active !== null) {
            onMove(e);
          }
        }}
        onPointerLeave={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full"
          role="img"
          aria-label="Évolution du chiffre d'affaires sur 6 mois"
        >
          <defs>
            <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridYs.map((y, i) => (
            <line
              key={i}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="text-slate-200 dark:text-slate-800"
            />
          ))}

          {/* Vertical guide at the active month */}
          {active !== null && (
            <line
              x1={xs[active]}
              x2={xs[active]}
              y1={padTop - 6}
              y2={H - padBottom}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              opacity="0.6"
            />
          )}

          <path d={areaPath} fill="url(#rev-fill)" />
          <path
            d={linePath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Point dots */}
        {series.map((p, i) => {
          if (p.total <= 0 && active !== i) return null;
          const isLast = i === n - 1;
          const isActive = active === i;
          return (
            <span
              key={`dot-${p.month}`}
              className={
                "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full " +
                (isActive
                  ? "h-3 w-3 bg-emerald-400 ring-2 ring-white dark:ring-slate-900"
                  : isLast
                    ? "h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                    : "h-2 w-2 border-2 border-emerald-500 bg-white dark:bg-slate-900")
              }
              style={{ left: pct(xs[i], W), top: pct(ys[i], H) }}
            />
          );
        })}

        {/* Tooltip at the active point (month + value, incl. 0 €). When
            nothing is active, the last point's value stays visible. */}
        {active !== null ? (
          <span
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+9px)] whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-center text-[11px] font-semibold tabular-nums text-white shadow-lg dark:bg-slate-800"
            style={{
              left: `clamp(34px, ${pct(xs[active], W)}, calc(100% - 34px))`,
              top: pct(ys[active], H),
            }}
          >
            <span className="block text-[9px] font-medium uppercase tracking-wide text-emerald-300">
              {series[active].month}
            </span>
            {formatEUR(series[active].total)}
          </span>
        ) : (
          series.map((p, i) => {
            if (p.total <= 0 || i !== n - 1) return null;
            return (
              <span
                key={`val-${p.month}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+5px)] whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 sm:text-xs"
                style={{ left: pct(xs[i], W), top: pct(ys[i], H) }}
              >
                {formatEUR(p.total)}
              </span>
            );
          })
        )}
      </div>

      {/* Month labels — the active one turns emerald */}
      <div
        className="mt-2 grid"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {series.map((p, i) => (
          <span
            key={p.month}
            className={
              "text-center text-[11px] font-medium capitalize " +
              (active === i
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400")
            }
          >
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Catmull-Rom spline → cubic-bézier "d" string. Soft, natural curve
 * instead of hard polyline corners. Tension 0.5.
 */
function smoothPath(xs: number[], ys: number[]): string {
  const n = xs.length;
  if (n === 0) return "";
  if (n === 1) return `M ${xs[0]},${ys[0]}`;
  let d = `M ${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[i === 0 ? 0 : i - 1];
    const y0 = ys[i === 0 ? 0 : i - 1];
    const x1 = xs[i];
    const y1 = ys[i];
    const x2 = xs[i + 1];
    const y2 = ys[i + 1];
    const x3 = xs[i + 2 < n ? i + 2 : n - 1];
    const y3 = ys[i + 2 < n ? i + 2 : n - 1];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d;
}
