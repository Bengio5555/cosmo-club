"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { site } from "@/lib/site";
import logoSrc from "@/public/brand/cosmo-logo.png";

/**
 * Hero is now driven by a `heroSrc` prop resolved server-side. Earlier
 * we used the client-side `useImageConfig` hook here, which caused the
 * static fallback PNG to paint first and then visibly swap to the
 * admin-uploaded image once the hook fetched the config — that's the
 * "image flashing before the fixed one" the owner reported. Pulling
 * the URL into SSR removes the swap entirely.
 */
export function LiquidHero({ heroSrc }: { heroSrc: string }) {
  return (
    <section className="relative isolate h-[100svh] min-h-[680px] w-full overflow-hidden bg-[color:var(--color-cream-paper)]">
      {/* ─── Background image ─── */}
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={heroSrc}
          alt=""
          fill
          sizes="100vw"
          priority
          fetchPriority="high"
          className="object-cover object-center"
        />
      </div>

      {/* Gradient overlay for text readability */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(to top, rgba(237,227,201,0.85) 0%, rgba(237,227,201,0.35) 30%, rgba(237,227,201,0.15) 60%, rgba(237,227,201,0.45) 100%)",
        }}
      />

      {/* ─── Side eyebrow labels (desktop only) ─── */}
      <div className="pointer-events-none absolute inset-y-0 left-6 hidden items-center md:flex">
        <p className="eyebrow rotate-180 [writing-mode:vertical-rl]">
          Paris&nbsp;8 · Sur&nbsp;rendez-vous
        </p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-6 hidden items-center md:flex">
        <p className="eyebrow [writing-mode:vertical-rl]">
          Édition&nbsp;{new Date().getFullYear()}
        </p>
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center md:px-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mb-8 inline-flex items-center whitespace-nowrap font-body text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-grenat)] sm:text-[0.65rem] sm:tracking-[0.24em] md:mb-10 md:text-[0.72rem] md:tracking-[0.32em]"
        >
          <span className="rule hidden md:inline-block" />
          Cocktails · Barista · Événementiel
        </motion.p>

        {/* Logo lockup (accessible h1 hidden for SR).
            The LCP element MUST paint immediately — we drop the
            motion wrapper that previously hid the logo behind a
            1.6 s opacity fade. The motion still applies to the
            decorative underline below so the entrance feels alive. */}
        <div className="relative flex flex-col items-center">
          <h1 className="sr-only">Cosmo Club Paris</h1>
          <Image
            src={logoSrc}
            alt="Cosmo Club Paris"
            priority
            fetchPriority="high"
            // High-res PNG source — let next/image generate the per-
            // viewport AVIF/WebP variants so each device gets a crisp
            // build instead of the same heavy file.
            sizes="(min-width: 1024px) 560px, (min-width: 640px) 460px, 80vw"
            className="h-auto w-[80vw] max-w-[560px] select-none sm:w-[70vw] md:w-[58vw] lg:w-[42vw]"
          />
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.8, duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="mx-auto mt-4 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[color:var(--color-or-deep)]/80 to-transparent"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 1.1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-8 max-w-xl"
        >
          <p className="font-display text-lg italic tracking-wide text-[color:var(--color-grenat)] md:text-xl">
            « {site.baseline} »
          </p>
          <p className="mt-4 text-[13px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
            {site.tagline}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 1.1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/contact"
            onClick={() => track("devis_cta_click", { location: "hero_home" })}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
            <span className="relative">Demander un devis</span>
            <span className="relative h-[1px] w-6 bg-current transition-all duration-500 group-hover:w-10" />
          </Link>
          <Link
            href="#univers"
            className="inline-flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]"
          >
            <span className="h-[1px] w-6 bg-current" />
            Découvrir nos offres
          </Link>
        </motion.div>
      </div>

    </section>
  );
}
