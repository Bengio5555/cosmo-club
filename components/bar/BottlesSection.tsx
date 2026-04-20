import Image, { type StaticImageData } from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { bottles } from "@/lib/content/cocktails";
import bottle20Img from "@/public/brand/ai/bottle-20cl.png";
import bottle50Img from "@/public/brand/ai/bottle-50cl.png";
import bottle1LImg from "@/public/brand/ai/bottle-1L.png";

const bottleImages: StaticImageData[] = [bottle20Img, bottle50Img, bottle1LImg];

export function BottlesSection() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream)] py-28 md:py-40">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(201,169,97,0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 max-w-3xl md:mb-24">
          <p className="eyebrow mb-6"><span className="rule" />Cocktail « in a bottle »</p>
          <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
            La bouteille<br />
            <span className="font-accent italic text-[color:var(--color-grenat)]">
              qui devient souvenir.
            </span>
          </h2>
          <p className="mt-6 text-[color:var(--color-espresso)]/75 md:text-lg">
            Cocktails embouteillés sur place, étiquetés à votre marque. Trois formats pour trois intentions — un cadeau à emporter, une tablée qui se partage, un bar qui tourne toute la nuit.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {bottles.map((b, i) => (
            <Reveal
              key={b.format}
              delay={i * 140}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream-paper)]"
            >
              {/* Bottle photo */}
              <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                  src={bottleImages[i]}
                  alt={`Cosmo Club bouteille ${b.format}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.03]"
                />
              </div>

              {/* Info panel */}
              <div className="relative flex flex-col gap-3 p-8 md:p-10">
                <p className="font-display text-6xl leading-none text-[color:var(--color-grenat)] md:text-7xl">
                  {b.format}
                </p>
                <h3 className="mt-2 font-display text-3xl text-[color:var(--color-ink-text)]">
                  {b.label}
                </h3>
                <p className="text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">
                  {b.desc}
                </p>
                <div className="hairline my-3" />
                <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-or-deep)]">
                  {b.tag}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
