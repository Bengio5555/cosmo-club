"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import logoSrc from "@/public/brand/cosmo-logo.avif";

/**
 * Hero is now driven by a `heroSrc` prop resolved server-side. Earlier
 * we used the client-side `useImageConfig` hook here, which caused the
 * static fallback PNG to paint first and then visibly swap to the
 * admin-uploaded image once the hook fetched the config — that's the
 * "image flashing before the fixed one" the owner reported. Pulling
 * the URL into SSR removes the swap entirely.
 */
export function LiquidHero({ heroSrc }: { heroSrc: string }) {
  const heroUnoptimized = heroSrc.startsWith("/api/");

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
          unoptimized={heroUnoptimized}
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
        <p className="eyebrow [writing-mode:vertical-rl]">Édition&nbsp;MMXXVI</p>
      </div>

      {/* ─── Content ─── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center md:px-10">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="eyebrow mb-8 md:mb-10"
        >
          <span className="rule" />Cocktails · Barista · Événementiel
        </motion.p>

        {/* Logo lockup (accessible h1 hidden for SR) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.1, ease: [0.19, 1, 0.22, 1] }}
          className="relative flex flex-col items-center"
        >
          <h1 className="sr-only">Cosmo Club Paris</h1>
          <Image
            src={logoSrc}
            alt="Cosmo Club Paris"
            priority
            unoptimized
            // The logo is a wide lockup (~304×106 source). We size by
            // viewport width, capped, so it scales gracefully from
            // mobile to desktop without ever feeling small or
            // overwhelming the hero.
            sizes="(min-width: 1024px) 560px, (min-width: 640px) 460px, 80vw"
            className="h-auto w-[80vw] max-w-[560px] select-none sm:w-[70vw] md:w-[58vw] lg:w-[42vw]"
          />
          <div
            aria-hidden
            className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-[color:var(--color-or-deep)]/80 to-transparent"
          />
        </motion.div>

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

      {/* ─── Scroll indicator ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 1.4 }}
        className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 text-center"
      >
        <span className="eyebrow block mb-2 text-[color:var(--color-espresso)]/60">
          Scroll
        </span>
        <span className="relative mx-auto block h-10 w-px overflow-hidden bg-[color:var(--color-ash)]/40">
          <span className="absolute top-0 left-0 block h-4 w-px bg-[color:var(--color-grenat)] [animation:scroll-hint_2.4s_var(--ease-silk)_infinite]" />
        </span>
        <style>{`
          @keyframes scroll-hint {
            0%   { transform: translateY(-100%); }
            60%  { transform: translateY(150%); }
            100% { transform: translateY(150%); }
          }
        `}</style>
      </motion.div>
    </section>
  );
}
