"use client";

import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { cartes, type Carte } from "@/lib/content/cocktails";
import { cn } from "@/lib/utils";

const accentMap: Record<Carte["accent"], { bg: string; text: string; ring: string; glow: string }> = {
  cream: {
    bg: "#F5F1E8",
    text: "#0A0A0A",
    ring: "rgba(10,10,10,0.25)",
    glow: "radial-gradient(ellipse 60% 60% at 70% 30%, rgba(201,169,97,0.35), transparent 60%)",
  },
  grenat: {
    bg: "#24100f",
    text: "#F5F1E8",
    ring: "rgba(245,241,232,0.18)",
    glow: "radial-gradient(ellipse 60% 60% at 80% 30%, rgba(181,50,43,0.55), transparent 60%)",
  },
  or: {
    bg: "#17120b",
    text: "#E8D8A8",
    ring: "rgba(201,169,97,0.25)",
    glow: "radial-gradient(ellipse 60% 60% at 70% 25%, rgba(201,169,97,0.45), transparent 60%)",
  },
  bronze: {
    bg: "#0f0d0c",
    text: "#E9E2D0",
    ring: "rgba(201,169,97,0.18)",
    glow: "radial-gradient(ellipse 60% 60% at 30% 70%, rgba(139,26,26,0.35), transparent 60%)",
  },
};

export function StickyCartes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section
      id="cartes"
      ref={containerRef}
      className="relative bg-[color:var(--color-cream-paper)]"
      style={{ height: `${cartes.length * 100}vh` }}
    >
      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 mx-auto max-w-[1400px] px-6 pt-20 md:px-10">
        <p className="eyebrow"><span className="rule" />Les quatre cartes</p>
      </div>

      {cartes.map((carte, i) => (
        <CarteCard
          key={carte.id}
          carte={carte}
          index={i}
          total={cartes.length}
          progress={scrollYProgress}
        />
      ))}
    </section>
  );
}

function CarteCard({
  carte,
  index,
  total,
  progress,
}: {
  carte: Carte;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const step = 1 / total;
  const start = index * step;
  const end = (index + 1) * step;

  // scale previous cards down as they go "under" the next one
  const targetScale = 1 - (total - 1 - index) * 0.035;

  const scale = useTransform(progress, [start, end], [1, targetScale]);
  const rotate = useTransform(progress, [start, end], [0, -2.5 + index * 0.8]);

  const palette = accentMap[carte.accent];

  return (
    <div
      className="sticky top-0 flex h-screen items-center justify-center px-4 md:px-10"
      style={{ top: `calc(${index * 1.25}rem + 4rem)` }}
    >
      <motion.article
        style={{ scale, rotate, backgroundColor: palette.bg, color: palette.text }}
        className="relative flex h-[80vh] min-h-[560px] w-full max-w-[1300px] flex-col overflow-hidden rounded-[var(--radius-2xl)] border p-6 sm:p-10 md:p-14 lg:p-20"
      >
        {/* palette-specific glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: palette.glow }}
        />

        {/* ring border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[var(--radius-2xl)] border"
          style={{ borderColor: palette.ring }}
        />

        <header className="relative z-10 flex items-start justify-between gap-6">
          <div>
            <p
              className="text-[11px] uppercase tracking-[0.32em]"
              style={{ color: mix(palette.text, 0.7) }}
            >
              {carte.kicker}
            </p>
            <p
              className="mt-1 text-xs uppercase tracking-[0.4em]"
              style={{ color: mix(palette.text, 0.5) }}
            >
              Carte {carte.num}
            </p>
          </div>
          <span
            className="font-display text-5xl md:text-6xl"
            style={{ color: mix(palette.text, 0.3) }}
          >
            0{index + 1}
          </span>
        </header>

        <div className="relative z-10 mt-auto grid gap-12 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <h3 className="font-display text-[18vw] leading-[0.95] sm:text-7xl md:text-[11vw] lg:text-[10rem]">
              {carte.name}
            </h3>
            <p
              className="mt-4 font-accent text-2xl italic md:text-3xl"
              style={{ color: mix(palette.text, 0.85) }}
            >
              « {carte.tagline} »
            </p>
            <p
              className="mt-6 max-w-xl text-[15px] leading-relaxed md:text-base"
              style={{ color: mix(palette.text, 0.75) }}
            >
              {carte.description}
            </p>
          </div>

          <ul
            className={cn("space-y-3 text-[15px] md:text-base")}
            style={{ color: mix(palette.text, 0.85) }}
          >
            <li
              className="pb-2 text-[10px] uppercase tracking-[0.32em]"
              style={{
                color: mix(palette.text, 0.5),
                borderBottom: `1px solid ${palette.ring}`,
              }}
            >
              {carte.id === "creation" ? "Le parcours" : "Signatures maison"}
            </li>
            {carte.signatures.map((s) => (
              <li key={s} className="flex items-baseline gap-3">
                <span
                  className="font-display text-[10px]"
                  style={{ color: mix(palette.text, 0.4) }}
                >
                  ·
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.article>
    </div>
  );
}

/** Blend a hex color toward its inverse by `amount` (0–1). Used to derive
 * "muted" / "soft" / "subtle" text tones from the card's base text color. */
function mix(hex: string, amount: number): string {
  // If text color is light (cream/bone), mute by going toward darker.
  // If dark (ink), mute by going toward lighter.
  const isLight = parseInt(hex.replace("#", "").slice(0, 2), 16) > 128;
  return `color-mix(in srgb, ${hex} ${Math.round(amount * 100)}%, ${isLight ? "#0a0a0a" : "#f5f1e8"})`;
}
