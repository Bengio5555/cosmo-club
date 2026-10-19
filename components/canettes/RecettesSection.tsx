import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { recettes } from "@/lib/content/canettes";

/**
 * Les recettes, en version compacte : la section doit se lire vite pour
 * amener à la personnalisation juste en dessous, surtout sur mobile.
 *  - titre et intro sur une même rangée en desktop ;
 *  - photo du trio en paysage sur mobile (pas de portrait plein écran),
 *    portrait seulement à partir de md ;
 *  - une ligne par information dans chaque recette, garniture réduite à
 *    la première option.
 */
export function RecettesSection({ imageSrc }: { imageSrc: string }) {
  return (
    <section id="recettes" className="relative bg-[color:var(--color-cream)] py-14 md:py-20">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between md:gap-10">
          <div>
            <p className="eyebrow mb-4"><span className="rule" />Les recettes</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-6xl">
              Nos recettes,{" "}
              <span className="font-accent text-[color:var(--color-grenat)]">Mocktails.</span>
            </h2>
          </div>
          <p className="max-w-md text-[15px] text-[color:var(--color-espresso)]/70 md:text-right">
            Créées par nos mixologues pour tenir en canette : purées de fruits, sirops d’auteur, bulle fine. Lattes glacés sur demande.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:gap-14">
          <Reveal className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius-xl)] md:aspect-square md:self-center">
            <Image
              src={imageSrc}
              alt="Les recettes Mocktail in a can : Litchi Rose, Framboise Hibiscus, Coco Pêche Aloe Vera"
              fill
              sizes="(min-width: 768px) 38vw, 100vw"
              className="object-cover object-[center_70%] md:object-[center_60%]"
            />
          </Reveal>

          <div className="divide-y divide-[color:var(--color-ash)]/60 md:self-center">
            {recettes.map((r, i) => (
              <Reveal
                key={r.id}
                delay={i * 120}
                className="group flex items-center gap-4 py-5 first:pt-0 last:pb-0 md:gap-6 md:py-6"
              >
                <Image
                  src={r.illustration}
                  alt=""
                  width={112}
                  height={112}
                  className="h-16 w-16 shrink-0 object-contain md:h-24 md:w-24"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 md:items-baseline">
                    <h3 className="font-display text-2xl text-[color:var(--color-ink-text)] md:text-3xl">
                      {r.name}
                      <span className="mt-0.5 block font-accent text-base text-[color:var(--color-grenat)] md:ml-3 md:mt-0 md:inline md:text-lg">{r.tasting}</span>
                    </h3>
                    <span className="font-display text-sm tabular-nums text-[color:var(--color-or)]">{r.num}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[color:var(--color-espresso)]/80 md:text-[15px]">{r.base}</p>
                  <p className="mt-1.5 whitespace-nowrap text-[9px] uppercase tracking-[0.2em] text-[color:var(--color-espresso)]/55 md:text-[10px] md:tracking-[0.28em]">
                    Garniture · {r.garnishShort}
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
