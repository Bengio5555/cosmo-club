"use client";

import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { bottles } from "@/lib/content/cocktails";
import bottle20Img from "@/public/brand/ai/bottle-20cl.png";
import bottle50Img from "@/public/brand/ai/bottle-50cl.png";
import bottle1LImg from "@/public/brand/ai/bottle-1L.png";
import { useImageConfig, pickPath } from "@/lib/hooks/useImageConfig";

// Keys must match images-config.json → pages.products.<key>
const bottleSlotKeys = ["bottle-20cl", "bottle-50cl", "bottle-1L"] as const;
const bottleFallbacks = [bottle20Img.src, bottle50Img.src, bottle1LImg.src];

export function BottlesSection() {
  const config = useImageConfig();
  const bottleSrcs = bottleSlotKeys.map((k, i) =>
    pickPath(config, "products", k, bottleFallbacks[i]),
  );

  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream)] py-20 md:py-28">
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

        <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3">
          {bottles.map((b, i) => (
            <Reveal
              key={b.format}
              delay={i * 140}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream-paper)]"
            >
              {/* Bottle photo */}
              <div className="relative aspect-[4/5] w-full overflow-hidden">
                <Image
                  key={bottleSrcs[i]}
                  src={bottleSrcs[i]}
                  alt={`Cosmo Club bouteille ${b.format}`}
                  fill
                  sizes="(min-width: 768px) 320px, 100vw"
                  unoptimized={bottleSrcs[i].startsWith("/api/")}
                  className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.03]"
                />
              </div>

              {/* Info panel */}
              <div className="relative flex flex-col gap-2 p-6 md:p-7">
                <p className="font-display text-4xl leading-none text-[color:var(--color-grenat)] md:text-5xl">
                  {b.format}
                </p>
                <h3 className="mt-1 font-display text-xl text-[color:var(--color-ink-text)] md:text-2xl">
                  {b.label}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--color-espresso)]/80">
                  {b.desc}
                </p>
                <div className="hairline my-2" />
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
