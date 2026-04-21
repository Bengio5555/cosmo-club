import { Reveal } from "@/components/motion/Reveal";
import { bars } from "@/lib/content/cocktails";

export function BarsSection() {
  return (
    <section className="relative bg-[color:var(--color-cream)] py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 flex flex-col md:mb-24 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6"><span className="rule" />Nos bars</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Un bar,<br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                sculpté pour l'espace.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Modules, matériaux, dimensions — chaque bar prend la forme du lieu et porte votre identité.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          {bars.map((b, i) => (
            <Reveal
              key={b.name}
              delay={i * 120}
              className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream-paper)] p-8 transition-colors duration-700 hover:border-[color:var(--color-or)]/50 md:p-12"
            >
              {/* bar silhouette */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-60 transition-opacity duration-700 group-hover:opacity-90"
                style={{
                  backgroundImage:
                    i % 2 === 0
                      ? "radial-gradient(circle at 80% 30%, rgba(201,169,97,0.18), transparent 55%), linear-gradient(150deg, #1a1511, #0a0a0a)"
                      : "radial-gradient(circle at 20% 80%, rgba(181,50,43,0.22), transparent 55%), linear-gradient(150deg, #1a0f0f, #0a0a0a)",
                }}
              />

              <div className="relative flex items-start justify-between gap-6">
                <div>
                  <p className="eyebrow">
                    0{i + 1} · {b.tagline}
                  </p>
                  <h3 className="mt-3 font-display text-4xl text-[color:var(--color-ink-text)] md:text-5xl">
                    {b.name}
                  </h3>
                </div>
                <svg
                  aria-hidden
                  viewBox="0 0 80 60"
                  className="h-12 w-auto opacity-40 transition-opacity duration-700 group-hover:opacity-70 md:h-16"
                >
                  <rect x="6" y="24" width="68" height="28" fill="none" stroke="#C9A961" strokeWidth="0.8" />
                  <rect x="6" y="20" width="68" height="4" fill="#C9A961" opacity="0.6" />
                  <line x1="22" y1="24" x2="22" y2="52" stroke="#C9A961" strokeOpacity="0.4" />
                  <line x1="40" y1="24" x2="40" y2="52" stroke="#C9A961" strokeOpacity="0.4" />
                  <line x1="58" y1="24" x2="58" y2="52" stroke="#C9A961" strokeOpacity="0.4" />
                </svg>
              </div>
              <p className="relative mt-4 max-w-lg text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">
                {b.desc}
              </p>
              <div className="relative mt-6 flex items-center justify-between border-t border-[color:var(--color-ash)]/60 pt-4 text-[10px] uppercase tracking-[0.32em]">
                <span className="text-[color:var(--color-grenat)]">{b.capacity}</span>
                <span className="text-[color:var(--color-espresso)]/40">Sur-mesure</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
