import { Reveal } from "@/components/motion/Reveal";
import { shots } from "@/lib/content/cocktails";

export function ShotsSection() {
  return (
    <section className="relative bg-[color:var(--color-cream-paper)] py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 flex flex-col md:mb-24 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6"><span className="rule" />L'accélérateur</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Shots.<br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                Le geste qui met le feu.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Une respiration, un rituel, un temps fort. Trois familles selon l'humeur que vous voulez lancer.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {shots.map((col, i) => (
            <Reveal
              key={col.title}
              delay={i * 140}
              className="group relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-8 md:p-10"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full opacity-40 transition-opacity duration-700 group-hover:opacity-70"
                style={{
                  background:
                    i === 2
                      ? "radial-gradient(circle, rgba(201,169,97,0.35), transparent 65%)"
                      : "radial-gradient(circle, rgba(181,50,43,0.3), transparent 65%)",
                }}
              />

              <p className="eyebrow text-[color:var(--color-or)]">{col.tag}</p>
              <h3 className="mt-3 font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
                {col.title}
              </h3>
              <div className="hairline my-6" />
              <ul className="space-y-3 text-[15px] text-[color:var(--color-espresso)]/80">
                {col.items.map((item) => (
                  <li key={item} className="flex items-baseline gap-3">
                    <span className="font-display text-xs text-[color:var(--color-or)]/70">·</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/40">
                Famille 0{i + 1} / 03
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
