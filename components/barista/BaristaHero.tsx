"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { SplitText } from "@/components/motion/SplitText";

/**
 * heroSrc is now resolved server-side and passed in as a prop. Same
 * fix as LiquidHero / BarHero — prevents the visible swap from the
 * static fallback PNG to the admin-uploaded image on first paint.
 */
export function BaristaHero({ heroSrc }: { heroSrc: string }) {
  const heroUnoptimized = heroSrc.startsWith("/api/");

  return (
    <section className="relative isolate h-[100svh] min-h-[700px] overflow-hidden bg-[color:var(--color-cream-paper)]">
      {/* editorial backdrop */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={heroSrc}
          alt=""
          fill
          sizes="100vw"
          priority
          unoptimized={heroUnoptimized}
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(237,227,201,0.58) 0%, rgba(237,227,201,0.18) 50%, transparent 100%)",
          }}
        />
      </div>

      <div className="vignette absolute inset-0 -z-10" aria-hidden />

      {/* side labels */}
      <div className="pointer-events-none absolute inset-y-0 left-6 hidden items-center md:flex">
        <p className="eyebrow rotate-180 [writing-mode:vertical-rl]">Matcha · Ube · Blue · Golden</p>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-center px-6 pt-24 md:px-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="eyebrow mb-8"
        >
          <span className="rule" />Offre signature · Barista
        </motion.p>

        <h1 className="font-display text-[13vw] leading-[0.92] text-balance text-[color:var(--color-ink-text)] sm:text-[12vw] md:text-[9vw]">
          <SplitText text="Latte," as="span" className="block" delay={0.3} />
          {/* Compensates the descender breathing room SplitText now
              reserves below each line — keeps the two-line gap tight. */}
          <span className="-mt-[0.22em] block">
            <SplitText
              text="d'exception."
              as="span"
              className="font-accent italic text-[color:var(--color-grenat)]"
              delay={0.9}
            />
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-10 max-w-2xl"
        >
          {/* Liquid-glass card — same treatment as BarHero so the lede
              stays legible on any backdrop crop while keeping the
              editorial premium feel. */}
          <div className="relative overflow-hidden rounded-xl bg-white/45 px-6 py-5 shadow-[0_24px_60px_-24px_rgba(20,12,8,0.55),inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.06)] ring-1 ring-white/35 backdrop-blur-2xl md:px-7 md:py-6">
            <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-[color:var(--color-or)]/[0.06]" />
            <span aria-hidden className="absolute left-0 top-0 h-full w-[2px] bg-[color:var(--color-grenat)]/85" />
            <p className="relative text-lg leading-relaxed text-[color:var(--color-ink-text)] md:text-xl">
              Matcha, Ube, Blue, Golden. Quatre lattes d'auteur, servis chauds ou glacés depuis un stand qui devient scène. Un bar unique — <em className="font-accent italic text-[color:var(--color-grenat)]">instagrammable sans l'avoir cherché</em>.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
        >
          <Link
            href="#lattes"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
            <span className="relative">Voir la carte</span>
            <span className="relative h-[1px] w-6 bg-current transition-all duration-500 group-hover:w-10" />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
          >
            <span className="h-[1px] w-6 bg-current" />
            Demander un devis
          </Link>
        </motion.div>

        <div className="pointer-events-none absolute bottom-10 right-6 hidden flex-col items-start gap-1 md:flex md:right-10">
          {["Matcha", "Ube", "Blue", "Golden"].map((n, i) => (
            <div
              key={n}
              className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-ink-text)]"
            >
              <span className="font-display font-bold tabular-nums text-[color:var(--color-ink-text)]">0{i + 1}</span>
              <span>{n}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
