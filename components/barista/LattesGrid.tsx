"use client";

import { Reveal } from "@/components/motion/Reveal";
import Image from "next/image";
import { lattes, type Latte } from "@/lib/content/barista";
import matchaImg from "@/public/brand/ai/latte-matcha.png";
import ubeImg from "@/public/brand/ai/latte-ube.png";
import blueImg from "@/public/brand/ai/latte-blue.png";
import goldenImg from "@/public/brand/ai/latte-golden.png";
import { useImageConfig, pickPath, type ImageConfig } from "@/lib/hooks/useImageConfig";

// Latte id → config slot key (must match images-config.json → pages.lattes.*)
const slotKey: Record<Latte["id"], string> = {
  matcha: "latte-matcha",
  ube: "latte-ube",
  blue: "latte-blue",
  golden: "latte-golden",
};

const latteFallbacks: Record<Latte["id"], string> = {
  matcha: matchaImg.src,
  ube: ubeImg.src,
  blue: blueImg.src,
  golden: goldenImg.src,
};

function resolveLatteSrc(config: ImageConfig | null, id: Latte["id"]): string {
  return pickPath(config, "lattes", slotKey[id], latteFallbacks[id]);
}

export function LattesGrid() {
  const config = useImageConfig();

  return (
    <section id="lattes" className="relative bg-[color:var(--color-cream)] py-20 md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 50% at 15% 20%, rgba(111,143,79,0.16), transparent 60%), radial-gradient(ellipse 50% 50% at 85% 80%, rgba(184,138,42,0.14), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 flex flex-col md:mb-24 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6"><span className="rule" />Les signatures</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Quatre couleurs,<br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                quatre rituels.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Chauds ou glacés, au lait de vache ou végétal, servis dans une tasse qu'on a envie de photographier avant d'en boire.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 md:gap-6">
          {lattes.map((l, i) => (
            <LatteCard
              key={l.id}
              latte={l}
              delay={i * 120}
              src={resolveLatteSrc(config, l.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function LatteCard({
  latte,
  delay,
  src,
}: {
  latte: Latte;
  delay: number;
  src: string;
}) {
  return (
    <Reveal
      delay={delay}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream-paper)] p-6 transition-colors duration-700 hover:border-[color:var(--color-or)]/40 md:p-8"
    >
      {/* colored halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-40 blur-2xl transition-opacity duration-700 group-hover:opacity-70"
        style={{ background: latte.hue.primary }}
      />

      {/* top cup view */}
      <div className="relative mb-6 flex items-center justify-center md:mb-10">
        <div className="relative h-48 w-48 overflow-hidden rounded-full md:h-60 md:w-60">
          <Image
            key={src}
            src={src}
            alt={`Latte ${latte.name}`}
            fill
            sizes="(min-width: 768px) 240px, 192px"
            unoptimized={src.startsWith("/api/")}
            className="object-cover"
          />
        </div>
      </div>

      <div className="relative flex items-baseline justify-between">
        <p className="eyebrow">{latte.num} · {latte.origin}</p>
        <span
          className="font-display text-xs tracking-[0.3em]"
          style={{ color: latte.hue.soft }}
        >
          Hot · Iced
        </span>
      </div>

      <h3 className="relative mt-3 font-display text-5xl leading-none text-[color:var(--color-ink-text)] md:text-6xl">
        {latte.name}
      </h3>

      <p
        className="relative mt-3 font-accent text-lg italic md:text-xl"
        style={{ color: latte.hue.soft }}
      >
        « {latte.tasting} »
      </p>

      <div className="hairline relative my-5" />

      <p className="relative text-sm leading-relaxed text-[color:var(--color-espresso)]/80">
        {latte.base}
      </p>

      <ul className="relative mt-5 flex flex-wrap gap-2">
        {latte.notes.map((n) => (
          <li
            key={n}
            className="rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em]"
            style={{
              // The "soft" pastels were nearly invisible on the cream
              // background. Using the saturated `primary` hue gives
              // each latte its real signature colour and proper
              // contrast on the page bg.
              borderColor: `${latte.hue.primary}66`,
              color: latte.hue.primary,
            }}
          >
            {n}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

