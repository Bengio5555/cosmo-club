import { Reveal } from "@/components/motion/Reveal";
import { etapes, regles } from "@/lib/content/canettes";

export function ProcessSection() {
  return (
    <section className="relative bg-[color:var(--color-cream-paper)] py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-14 max-w-2xl md:mb-20">
          <p className="eyebrow mb-6"><span className="rule" />Comment ça marche</p>
          <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-6xl">
            Du brief<br />
            <span className="font-accent text-[color:var(--color-grenat)]">
              à la canette scellée.
            </span>
          </h2>
        </Reveal>

        <ol className="grid gap-6 md:grid-cols-4">
          {etapes.map((e, i) => (
            <Reveal
              key={e.title}
              delay={i * 120}
              className="relative rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-6 md:p-7"
            >
              <span className="font-display text-4xl text-[color:var(--color-or)]/80">0{i + 1}</span>
              <h3 className="mt-4 font-display text-2xl text-[color:var(--color-ink-text)]">{e.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">{e.desc}</p>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mt-12 md:mt-16">
          <ul className="flex flex-wrap gap-x-8 gap-y-3 border-t border-[color:var(--color-ash)]/60 pt-6 text-sm text-[color:var(--color-espresso)]/75">
            {regles.map((r) => (
              <li key={r} className="flex items-center gap-3">
                <span className="h-[4px] w-[4px] rounded-full bg-[color:var(--color-or)]" />
                {r}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
