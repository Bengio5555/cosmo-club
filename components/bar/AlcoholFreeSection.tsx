import { Reveal } from "@/components/motion/Reveal";
import { alcoholFree } from "@/lib/content/cocktails";

export function AlcoholFreeSection() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream-paper)] py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 40% 40% at 85% 20%, rgba(110,140,90,0.18), transparent 60%), radial-gradient(ellipse 40% 40% at 15% 80%, rgba(201,169,97,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 md:mb-24">
          <p className="eyebrow mb-6"><span className="rule" />Sans alcool, sans compromis</p>
          <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
            Juice bar<br />
            <span className="font-accent italic text-[color:var(--color-grenat)]">
              &nbsp;&amp; mocktails.
            </span>
          </h2>
          <p className="mt-6 max-w-2xl text-[color:var(--color-espresso)]/75 md:text-lg">
            Une carte pensée à part entière. Ni raccourci, ni version allégée — des boissons qui existent par elles-mêmes, servies avec le même soin que nos cocktails.
          </p>
        </Reveal>

        <div className="grid gap-10 md:grid-cols-2 md:gap-6">
          {/* Juice Bar */}
          <Reveal className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-8 md:p-12">
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">01 Juice bar</p>
              <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-espresso)]/40">
                Pressé minute
              </span>
            </div>
            <h3 className="mt-4 font-display text-4xl text-[color:var(--color-ink-text)] md:text-5xl">
              Le vivant, en verre.
            </h3>
            <ul className="mt-8 space-y-4 text-[15px] leading-relaxed text-[color:var(--color-espresso)]/85">
              {alcoholFree.juicebar.map((j) => (
                <li key={j} className="flex items-start gap-3">
                  <span className="mt-[0.35em] h-[6px] w-[6px] shrink-0 rounded-full bg-[color:var(--color-or)]" />
                  <span>{j}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Mocktails */}
          <Reveal
            delay={140}
            className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-8 md:p-12"
          >
            <div className="flex items-baseline justify-between">
              <p className="eyebrow">02 Mocktails</p>
              <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-espresso)]/40">
                Zero proof
              </span>
            </div>
            <h3 className="mt-4 font-display text-4xl text-[color:var(--color-ink-text)] md:text-5xl">
              La sélection.
            </h3>
            <ul className="mt-8 grid gap-2 text-[15px] text-[color:var(--color-espresso)]/85 md:grid-cols-2">
              {alcoholFree.mocktails.map((m) => (
                <li key={m} className="border-t border-[color:var(--color-ash)]/60 py-2">
                  {m}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
