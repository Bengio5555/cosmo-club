import { Reveal } from "@/components/motion/Reveal";

export function MixologieIntro() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream)] py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 40% 40% at 10% 20%, rgba(139,26,26,0.2), transparent 60%), radial-gradient(ellipse 40% 40% at 90% 80%, rgba(201,169,97,0.08), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="eyebrow"><span className="rule" />Notre approche</p>
            <p className="mt-6 font-accent text-3xl italic leading-snug text-[color:var(--color-grenat)] md:text-4xl">
              Le cocktail, <br />
              comme une pièce <br />
              de haute couture.
            </p>
          </div>

          <Reveal className="space-y-8">
            <p className="font-display text-3xl leading-tight text-[color:var(--color-ink-text)] md:text-4xl">
              On sélectionne les alcools comme on choisit les tissus. On dose les sirops comme on ajuste une couture. On présente le verre comme on dévoile un modèle.
            </p>
            <div className="hairline" />
            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  k: "Précision",
                  v: "Ratios travaillés au 0,5 cl près, glace taillée, agrumes pressés sur place.",
                },
                {
                  k: "Matière",
                  v: "Alcools de marque, infusions maison, bitters d'atelier, or alimentaire 24k.",
                },
                {
                  k: "Geste",
                  v: "Un spectacle, jamais une démonstration. Le service reste l'invité principal.",
                },
              ].map((c) => (
                <div key={c.k} className="border-t border-[color:var(--color-ash)]/60 pt-4">
                  <p className="font-display text-xl text-[color:var(--color-or)]">{c.k}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-espresso)]/75">
                    {c.v}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
