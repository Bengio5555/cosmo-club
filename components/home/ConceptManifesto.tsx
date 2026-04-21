import { Reveal } from "@/components/motion/Reveal";

export function ConceptManifesto() {
  return (
    <section
      id="concept"
      className="relative overflow-hidden bg-[color:var(--color-cream-soft)] py-24 text-[color:var(--color-ink-text)] md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 80% 20%, rgba(139,26,26,0.08), transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(201,169,97,0.16), transparent 55%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-16 px-6 md:grid-cols-[1fr_2fr] md:px-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
            <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-grenat)] opacity-70" />
            Le concept
          </p>
          <p className="mt-6 font-accent text-3xl italic leading-snug text-[color:var(--color-grenat)] md:text-4xl">
            De&nbsp;Cosmopolitain. <br />
            Bienvenue au Cosmo Club.
          </p>
        </div>

        <Reveal className="space-y-8">
          <p className="font-display text-3xl leading-tight text-[color:var(--color-ink-text)] md:text-5xl">
            Là où les cocktails deviennent des œuvres liquides et&nbsp;les soirées sont toujours uniques.
          </p>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-[color:var(--color-or-deep)]/70 to-transparent" />
          <p className="max-w-2xl text-lg leading-relaxed text-[color:var(--color-espresso)]/85 md:text-xl">
            Ici, on mélange l'inattendu avec les classiques, et chaque verre raconte sa propre histoire. De la sélection des alcools aux glaçons gravés, jusqu'aux pochoirs sur vos mousses de latte — rien n'est laissé au hasard.
          </p>
          <div className="grid gap-6 pt-6 md:grid-cols-3">
            {[
              { k: "12+", v: "Mixologistes & baristas" },
              { k: "300+", v: "Événements signés" },
              { k: "∞", v: "Créations sur-mesure" },
            ].map((s) => (
              <div key={s.k} className="border-t border-[color:var(--color-ash-warm)] pt-4">
                <p className="font-display text-4xl text-[color:var(--color-grenat)] md:text-5xl">{s.k}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.22em] text-[color:var(--color-espresso)]/60">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
