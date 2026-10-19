"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { track } from "@/lib/track";
import { SplitText } from "@/components/motion/SplitText";

/**
 * Même construction que BaristaHero : la photo est résolue côté serveur
 * (admin-uploadable depuis /dashboard/images, slot canettes/hero) et
 * peinte aussi en CSS background pour que la carte en verre dépoli
 * voie toujours l'image, même avant la variante optimisée.
 */
export function CanettesHero({ heroSrc }: { heroSrc: string }) {
  return (
    <section
      className="relative isolate h-[100svh] min-h-[700px] overflow-hidden bg-[color:var(--color-cream-paper)] bg-cover bg-center"
      style={{ backgroundImage: `url(${heroSrc})` }}
    >
      <div aria-hidden className="absolute inset-0 -z-20">
        <Image
          src={heroSrc}
          alt=""
          fill
          sizes="100vw"
          quality={90}
          preload
          fetchPriority="high"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(237,227,201,0.28) 0%, rgba(237,227,201,0.06) 45%, transparent 70%)",
          }}
        />
      </div>

      <div className="vignette absolute inset-0 -z-10" aria-hidden />

      <div className="pointer-events-none absolute inset-y-0 left-6 hidden items-center md:flex">
        <p className="eyebrow rotate-180 [writing-mode:vertical-rl]">Sans alcool · 25 cl · Votre logo</p>
      </div>

      <div className="relative z-10 flex h-full flex-col justify-center px-6 pt-24 md:px-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mb-8 inline-flex w-fit items-center whitespace-nowrap rounded-full bg-[color:var(--color-cream)]/80 px-4 py-2 font-body text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-grenat)] shadow-[0_8px_24px_-12px_rgba(20,12,8,0.45),inset_0_1px_0_rgba(255,255,255,0.6)] ring-1 ring-white/40 backdrop-blur-xl sm:px-5 sm:text-[0.72rem] sm:tracking-[0.32em]"
        >
          <span className="rule hidden sm:inline-block" />Nouveau · Canettes personnalisées
        </motion.p>

        <h1 className="font-display text-[13vw] leading-[0.92] text-balance text-[color:var(--color-ink-text)] sm:text-[12vw] md:text-[9vw]">
          <SplitText text="Mocktail" as="span" className="block" delay={0.3} />
          <span className="-mt-[0.38em] block">
            <SplitText
              text="in a can."
              as="span"
              className="font-accent text-[color:var(--color-grenat)]"
              delay={0.9}
            />
          </span>
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.7, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-8 max-w-xl"
        >
          {/* Une ligne en italique, lisible sur la photo grâce à l’ombre crème,
              même traitement que le slider de l’accueil. Pas de paragraphe
              dans le hero : la page le dit juste en dessous. */}
          <p className="font-display text-xl leading-snug tracking-wide text-[color:var(--color-grenat)] [text-shadow:0_0_1px_rgba(243,235,217,1),0_0_6px_rgba(243,235,217,0.95),0_2px_24px_rgba(243,235,217,0.9)] md:text-2xl">
            Une canette transparente à vos couleurs.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 1, ease: [0.19, 1, 0.22, 1] }}
          className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
        >
          <Link
            href="#personnalisation"
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
            <span className="relative whitespace-nowrap"><span className="sm:hidden">Essayer ma marque</span><span className="hidden sm:inline">Voir ma marque sur la canette</span></span>
            <span className="relative h-[1px] w-6 bg-current transition-all duration-500 group-hover:w-10" />
          </Link>
          <Link
            href="/contact"
            onClick={() => track("devis_cta_click", { location: "hero_canettes" })}
            className="inline-flex items-center gap-3 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
          >
            <span className="h-[1px] w-6 bg-current" />
            Demander un devis
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
