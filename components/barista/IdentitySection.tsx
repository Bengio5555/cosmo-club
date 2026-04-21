import { Reveal } from "@/components/motion/Reveal";
import { identity } from "@/lib/content/barista";

export function IdentitySection() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream)] py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 40% 40% at 80% 20%, rgba(201,169,97,0.16), transparent 60%), radial-gradient(ellipse 40% 40% at 20% 80%, rgba(139,26,26,0.18), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-14 md:grid-cols-[1fr_1.6fr] md:gap-20">
          <Reveal>
            <p className="eyebrow"><span className="rule" />Votre identité, partout</p>
            <h2 className="mt-6 font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-6xl">
              Votre marque<br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                flotte à la surface.
              </span>
            </h2>
            <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/75">
              Trois terrains de jeu pour inscrire votre signature — du gobelet au stand, en passant par la mousse. Ça devient votre moment, pas le nôtre.
            </p>
          </Reveal>

          <div className="space-y-0 divide-y divide-[color:var(--color-ash)]/60">
            {identity.map((item, i) => (
              <Reveal
                key={item.title}
                delay={i * 140}
                className="group relative flex flex-col gap-3 py-8 md:flex-row md:items-baseline md:gap-8 md:py-10"
              >
                <span className="font-display text-4xl text-[color:var(--color-or)]/80 transition-colors duration-500 group-hover:text-[color:var(--color-or)] md:text-5xl md:min-w-[4ch]">
                  0{i + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-display text-2xl text-[color:var(--color-ink-text)] md:text-3xl">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">
                    {item.desc}
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-or)]">
                    {item.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
