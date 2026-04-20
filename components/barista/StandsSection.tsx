import { Reveal } from "@/components/motion/Reveal";
import { stands } from "@/lib/content/barista";

export function StandsSection() {
  return (
    <section className="relative bg-[color:var(--color-cream-paper)] py-28 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 flex flex-col md:mb-24 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6"><span className="rule" />Les stands</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Du plus épuré<br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                au plus premium.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Trois formats, chacun pensé pour une intensité d'événement. On monte en finitions, en nombre de baristas, en largeur de carte.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {stands.map((s, i) => (
            <Reveal
              key={s.tier}
              delay={i * 140}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-6 transition-colors duration-700 hover:border-[color:var(--color-or)]/50 md:p-8"
            >
              {/* tier accent bar */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(90deg, transparent, rgba(233,226,208,0.5), transparent)"
                      : i === 1
                      ? "linear-gradient(90deg, transparent, rgba(201,169,97,0.7), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(181,50,43,0.7), transparent)",
                }}
              />

              {/* stand SVG */}
              <svg
                aria-hidden
                viewBox="0 0 200 140"
                className="mb-6 h-28 w-full opacity-70 transition-opacity duration-700 group-hover:opacity-100 md:h-32"
              >
                <defs>
                  <linearGradient id={`stand-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9A961" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#C9A961" stopOpacity="0.08" />
                  </linearGradient>
                </defs>
                {/* countertop */}
                <rect
                  x={20 + i * 4}
                  y={60 - i * 6}
                  width={160 - i * 8}
                  height="6"
                  fill="#C9A961"
                  opacity="0.55"
                />
                {/* front panel */}
                <rect
                  x={20 + i * 4}
                  y={66 - i * 6}
                  width={160 - i * 8}
                  height={70 + i * 6}
                  fill={`url(#stand-${i})`}
                  stroke="#C9A961"
                  strokeOpacity="0.35"
                  strokeWidth="0.8"
                />
                {/* machine on top */}
                <rect x={42 + i * 6} y={30 - i * 6} width="26" height="30" fill="none" stroke="#C9A961" strokeOpacity="0.55" />
                <circle cx={55 + i * 6} cy={52 - i * 6} r="2" fill="#C9A961" />
                {/* carafe */}
                <rect x={100 + i * 4} y={40 - i * 6} width="10" height="20" fill="none" stroke="#C9A961" strokeOpacity="0.55" />
                {/* sign / neon for tier 2-3 */}
                {i >= 1 && (
                  <g stroke={i === 2 ? "#B5322B" : "#E8D8A8"} strokeOpacity="0.7" strokeWidth="1.1" fill="none">
                    <path d="M140 20 Q150 14 162 20 Q172 26 180 20" />
                  </g>
                )}
                {/* barista count dots */}
                <g fill="#C9A961">
                  {Array.from({ length: i + 1 }).map((_, j) => (
                    <circle key={j} cx={46 + j * 16} cy={90} r="2.5" opacity="0.7" />
                  ))}
                </g>
              </svg>

              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-[color:var(--color-or)]">0{i + 1} · {s.range}</p>
                <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-espresso)]/40">
                  {i === 2 ? "Signature" : i === 1 ? "Recommandé" : "Essentiel"}
                </span>
              </div>

              <h3 className="mt-3 font-display text-4xl text-[color:var(--color-ink-text)] md:text-5xl">
                {s.tier}
              </h3>

              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">
                {s.desc}
              </p>

              <ul className="mt-6 space-y-2 border-t border-[color:var(--color-ash)]/60 pt-4 text-sm">
                {s.specs.map((sp) => (
                  <li key={sp} className="flex items-center gap-3 text-[color:var(--color-espresso)]/80">
                    <span className="h-[4px] w-[4px] rounded-full bg-[color:var(--color-or)]" />
                    {sp}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
