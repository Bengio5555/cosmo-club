import { formatEUR } from "@/lib/format";

type Point = { month: string; total: number };

/**
 * 6-month revenue area chart — pure inline SVG (server-rendered, no
 * client JS). A smooth emerald gradient area with a line on top, a
 * faint baseline grid, value labels on the points that carry revenue,
 * and a highlighted last point. Reads much livelier than the old bar
 * chart when only the recent months have data.
 */
export function RevenueChart({
  series,
  max,
}: {
  series: Point[];
  max: number;
}) {
  // SVG coordinate space (scaled responsively via width:100%).
  const W = 620;
  const H = 210;
  const padX = 18;
  const padTop = 30; // room for value labels above points
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

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        preserveAspectRatio="none"
        className="h-52 w-full overflow-visible"
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
            className="text-slate-200 dark:text-slate-800"
          />
        ))}

        {/* Area + line */}
        <path d={areaPath} fill="url(#rev-fill)" />
        <path
          d={linePath}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points + value labels */}
        {series.map((p, i) => {
          const isLast = i === n - 1;
          const hasValue = p.total > 0;
          return (
            <g key={p.month}>
              {hasValue && (
                <text
                  x={xs[i]}
                  y={ys[i] - 12}
                  textAnchor="middle"
                  className="fill-slate-600 dark:fill-slate-300"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  {formatEUR(p.total)}
                </text>
              )}
              {hasValue && (
                <circle
                  cx={xs[i]}
                  cy={ys[i]}
                  r={isLast ? 5.5 : 3.5}
                  fill={isLast ? "#10b981" : "#fff"}
                  stroke="#10b981"
                  strokeWidth="2.5"
                  className={isLast ? "" : "dark:[fill:#0f172a]"}
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Month labels */}
      <div
        className="mt-1 grid"
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
