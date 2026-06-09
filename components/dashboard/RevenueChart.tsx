import { formatEUR } from "@/lib/format";

type Point = { month: string; total: number };

/**
 * 6-month revenue area chart — pure inline SVG (server-rendered, no
 * client JS).
 *
 * Layout strategy (mobile-first): the wrapper has a fixed, responsive
 * height (shorter on phones, taller on desktop) and the SVG fills it
 * with `preserveAspectRatio="none"` — so the smooth emerald area always
 * has real vertical presence instead of collapsing into a thin
 * sparkline on narrow screens. The crisp bits — the point dots and the
 * value labels — are NOT drawn inside the (stretched) SVG; they're
 * absolutely positioned HTML overlays placed by percentage, so they
 * never distort and keep a real, readable font-size on every viewport.
 * Intermediate value labels hide on phones (only the last stays) to
 * avoid overlap on narrow screens.
 */
export function RevenueChart({
  series,
  max,
}: {
  series: Point[];
  max: number;
}) {
  // SVG coordinate space (stretched to fill the wrapper).
  const W = 620;
  const H = 210;
  const padX = 18;
  const padTop = 30; // headroom so the curve never touches the top edge
  const padBottom = 8;
  const n = series.length;

  const xs = series.map((_, i) =>
    n <= 1 ? W / 2 : padX + (i * (W - padX * 2)) / (n - 1),
  );
  const ys = series.map(
    (p) => padTop + (1 - p.total / max) * (H - padTop - padBottom),
  );

  // Smooth path via Catmull-Rom → cubic bézier.
  const linePath = smoothPath(xs, ys);
  const areaPath =
    `${linePath} L ${xs[n - 1].toFixed(1)},${(H - padBottom).toFixed(1)}` +
    ` L ${xs[0].toFixed(1)},${(H - padBottom).toFixed(1)} Z`;

  const gridYs = [0, 0.5, 1].map(
    (f) => padTop + f * (H - padTop - padBottom),
  );

  const pct = (v: number, span: number) => `${(v / span) * 100}%`;

  return (
    <div className="mt-4">
      {/* Fixed responsive height + relative so HTML dots/labels can be
          positioned by percentage over the stretched SVG. */}
      <div className="relative h-40 w-full sm:h-48 lg:h-52">
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

          {/* Baseline grid */}
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

          {/* Area + line. non-scaling-stroke keeps the line an even
              2px regardless of the non-uniform stretch. */}
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

        {/* Point dots — HTML overlay, perfectly round at any size. */}
        {series.map((p, i) => {
          if (p.total <= 0) return null;
          const isLast = i === n - 1;
          return (
            <span
              key={`dot-${p.month}`}
              className={
                "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full " +
                (isLast
                  ? "h-2.5 w-2.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                  : "h-2 w-2 border-2 border-emerald-500 bg-white dark:bg-slate-900")
              }
              style={{ left: pct(xs[i], W), top: pct(ys[i], H) }}
            />
          );
        })}

        {/* Value labels — HTML overlay, crisp & readable. Intermediate
            labels hide on phones (only the last point stays) to dodge
            overlap on narrow screens. */}
        {series.map((p, i) => {
          if (p.total <= 0) return null;
          const isLast = i === n - 1;
          return (
            <span
              key={`val-${p.month}`}
              className={
                "pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+5px)] whitespace-nowrap text-[11px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 sm:text-xs " +
                (isLast ? "" : "hidden sm:block")
              }
              style={{ left: pct(xs[i], W), top: pct(ys[i], H) }}
            >
              {formatEUR(p.total)}
            </span>
          );
        })}
      </div>

      {/* Month labels */}
      <div
        className="mt-2 grid"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {series.map((p) => (
          <span
            key={p.month}
            className="text-center text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400"
          >
            {p.month}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Catmull-Rom spline → cubic-bézier "d" string. Gives the line a soft,
 * natural curve instead of hard polyline corners. Tension 0.5.
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
