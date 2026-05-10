import { Reveal } from "@/components/motion/Reveal";

export function InstagrammableSection() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream-paper)] py-24 md:py-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(111,143,79,0.18), transparent 65%), radial-gradient(ellipse 35% 35% at 20% 80%, rgba(111,74,143,0.14), transparent 60%), radial-gradient(ellipse 35% 35% at 80% 20%, rgba(184,138,42,0.14), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 text-center md:px-10">
        <Reveal>
          <p className="eyebrow mb-8 justify-center"><span className="rule" />L'effet</p>
          <h2 className="font-display text-balance text-5xl leading-[0.9] text-[color:var(--color-ink-text)] sm:text-6xl md:text-[9vw]">
            Un bar <span className="font-accent italic text-[color:var(--color-grenat)]">unique</span>.
          </h2>

          <div className="mx-auto mt-12 flex max-w-3xl flex-col items-center gap-6 md:flex-row md:justify-between">
            {[
              { k: "4", v: "Lattes signatures" },
              { k: "∞", v: "Combinaisons sur-mesure" },
              { k: "1", v: "Bar qui change votre soirée" },
            ].map((c) => (
              <div key={c.k} className="text-center">
                <p className="font-display text-5xl text-[color:var(--color-or)] md:text-6xl">
                  {c.k}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/60">
                  {c.v}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
