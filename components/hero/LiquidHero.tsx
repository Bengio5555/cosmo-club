"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { track } from "@/lib/track";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";
import logoSrc from "@/public/brand/cosmo-logo.png";

export type HeroSlides = {
  /** Visuel historique : logo + baseline. */
  home: string;
  /** Offre canettes personnalisées. */
  canettes: string;
  /** Offre barista — slide désactivée pour l'instant, URL optionnelle. */
  barista?: string;
};

const AUTOPLAY_MS = 7000;
const SWIPE_PX = 48;
const EASE = [0.19, 1, 0.22, 1] as const;

const SLIDE_ORDER = ["home", "canettes"] as const;
type SlideKey = (typeof SLIDE_ORDER)[number];

/**
 * Hero is driven by `slides` resolved server-side (one URL per visuel),
 * for the same reason the single `heroSrc` was: the admin-uploaded
 * images must be in the SSR HTML, never swapped in after hydration.
 *
 * Three visuels défilent : l'accueil (logo), l'offre canettes et
 * l'offre barista. Les trois images sont empilées et le fondu se fait
 * sur l'opacité ; seule la première est préchargée (c'est le LCP).
 */
export function LiquidHero({ slides }: { slides: HeroSlides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setIndex(((next % SLIDE_ORDER.length) + SLIDE_ORDER.length) % SLIDE_ORDER.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDE_ORDER.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [paused, index]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;
    const delta = (e.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < SWIPE_PX) return;
    go(delta < 0 ? index + 1 : index - 1);
  };

  const active: SlideKey = SLIDE_ORDER[index];

  return (
    <section
      role="region"
      aria-roledescription="carrousel"
      aria-label="Nos offres"
      className="relative isolate h-[100svh] min-h-[680px] w-full overflow-hidden bg-[color:var(--color-cream-paper)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ─── Background images, stacked, crossfade on opacity ─── */}
      <div aria-hidden className="absolute inset-0 -z-20">
        {SLIDE_ORDER.map((key, i) => (
          <div
            key={key}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-silk)]",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={slides[key]}
              alt=""
              fill
              sizes="100vw"
              quality={90}
              preload={i === 0}
              fetchPriority={i === 0 ? "high" : undefined}
              className="object-cover object-center"
            />
          </div>
        ))}
      </div>

      {/* Gradient overlay for text readability. The home slide keeps the
          full cream wash (logo + baseline sit directly on the photo); the
          offer slides put their text in a frosted card, so the photo
          stays clear and only the very bottom is softened under the CTAs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 transition-opacity duration-[1400ms] ease-[var(--ease-silk)]"
        style={{
          background:
            active === "home"
              ? "linear-gradient(to top, rgba(237,227,201,0.85) 0%, rgba(237,227,201,0.35) 30%, rgba(237,227,201,0.15) 60%, rgba(237,227,201,0.45) 100%)"
              : "linear-gradient(to top, rgba(237,227,201,0.45) 0%, rgba(237,227,201,0.08) 22%, transparent 45%)",
        }}
      />

      {/* ─── Side eyebrow labels (desktop only) ─── */}
      <div className="pointer-events-none absolute inset-y-0 left-6 hidden items-center md:flex">
        <p className="eyebrow rotate-180 [writing-mode:vertical-rl]">
          Paris&nbsp;7 · Sur&nbsp;rendez-vous
        </p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-6 hidden items-center md:flex">
        <p className="eyebrow [writing-mode:vertical-rl]">
          Édition&nbsp;{new Date().getFullYear()}
        </p>
      </div>

      {/* The accessible h1 stays in the DOM whatever the active slide. */}
      <h1 className="sr-only">Cosmo Club Paris</h1>

      {/* ─── Content (re-mounted per slide so the entrance replays) ─── */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 pt-16 text-center md:px-10">
        {active === "home" && <HomeSlide key="home" />}
        {active === "canettes" && (
          <OfferSlide
            key="canettes"
            eyebrow="Nouveau · Mocktail in a can"
            title="Votre logo,"
            accent="dans la main de chaque invité."
            lede="Une canette transparente à vos couleurs."
            href="/canettes-personnalisees"
            cta="Découvrir les canettes"
            location="hero_home_canettes"
          />
        )}
      </div>

      {/* ─── Controls ─── */}
      <button
        type="button"
        onClick={() => go(index - 1)}
        aria-label="Visuel précédent"
        className="absolute left-14 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--color-espresso)]/25 text-[color:var(--color-espresso)]/70 transition-colors hover:border-[color:var(--color-grenat)] hover:text-[color:var(--color-grenat)] md:flex"
      >
        <span aria-hidden className="text-lg leading-none">←</span>
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        aria-label="Visuel suivant"
        className="absolute right-14 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[color:var(--color-espresso)]/25 text-[color:var(--color-espresso)]/70 transition-colors hover:border-[color:var(--color-grenat)] hover:text-[color:var(--color-grenat)] md:flex"
      >
        <span aria-hidden className="text-lg leading-none">→</span>
      </button>

      <div className="absolute inset-x-0 bottom-8 z-20 flex items-center justify-center gap-3">
        {SLIDE_ORDER.map((key, i) => (
          <button
            key={key}
            type="button"
            onClick={() => go(i)}
            aria-label={`Visuel ${i + 1} sur ${SLIDE_ORDER.length}`}
            aria-current={i === index ? "true" : undefined}
            className="group flex h-6 items-center"
          >
            <span
              className={cn(
                "block h-[2px] rounded-full transition-all duration-500 ease-[var(--ease-silk)]",
                i === index
                  ? "w-10 bg-[color:var(--color-grenat)]"
                  : "w-5 bg-[color:var(--color-espresso)]/35 group-hover:bg-[color:var(--color-espresso)]/70",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}

/** Visuel 1 : le lockup historique, inchangé (logo = LCP, pas de fade). */
function HomeSlide() {
  return (
    <>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1, ease: EASE }}
        className="mb-8 inline-flex items-center whitespace-nowrap font-body text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-grenat)] sm:text-[0.65rem] sm:tracking-[0.24em] md:mb-10 md:text-[0.72rem] md:tracking-[0.32em]"
      >
        <span className="rule hidden md:inline-block" />
        Cocktails · Barista · Canettes · Événementiel
      </motion.p>

      <div className="relative flex flex-col items-center">
        <Image
          src={logoSrc}
          alt="Cosmo Club Paris"
          preload
          fetchPriority="high"
          sizes="(min-width: 1024px) 560px, (min-width: 640px) 460px, 80vw"
          className="h-auto w-[80vw] max-w-[560px] select-none sm:w-[70vw] md:w-[58vw] lg:w-[42vw]"
        />
        <motion.div
          aria-hidden
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 1, ease: EASE }}
          className="mx-auto mt-4 h-px w-40 origin-center bg-gradient-to-r from-transparent via-[color:var(--color-or-deep)]/80 to-transparent"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 1.1, ease: EASE }}
        className="mt-8 max-w-xl"
      >
        <p className="font-display text-lg tracking-wide text-[color:var(--color-grenat)] md:text-xl">
          « {site.baseline} »
        </p>
        <p className="mt-4 text-[13px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
          {site.tagline}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 1.1, ease: EASE }}
        className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
      >
        <PrimaryCta href="/contact" location="hero_home">
          Demander un devis
        </PrimaryCta>
        <SecondaryCta href="#univers">Découvrir nos offres</SecondaryCta>
      </motion.div>
    </>
  );
}

/** Visuels 2 et 3 : un titre, une accroche, un lien vers l'offre. */
function OfferSlide({
  eyebrow,
  title,
  accent,
  lede,
  href,
  cta,
  location,
}: {
  eyebrow: string;
  title: string;
  accent: string;
  lede: string;
  href: string;
  cta: string;
  location: string;
}) {
  return (
    <>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 1, ease: EASE }}
        className="mb-8 inline-flex items-center whitespace-nowrap font-body text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[color:var(--color-grenat)] sm:text-[0.65rem] sm:tracking-[0.24em] md:mb-10 md:text-[0.72rem] md:tracking-[0.32em]"
      >
        <span className="rule hidden md:inline-block" />
        {eyebrow}
      </motion.p>

      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 1.1, ease: EASE }}
        className="font-display text-balance text-[12vw] leading-[0.95] text-[color:var(--color-ink-text)] sm:text-[10vw] md:text-[5.5vw]"
      >
        {title}
        <br />
        <span className="font-accent text-[color:var(--color-grenat)]">{accent}</span>
      </motion.h2>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1, ease: EASE }}
        className="mt-8 max-w-xl"
      >
        {/* Plain lede, no card: the photo must stay visible. Same voice as
            the home baseline (display italic, garnet), with a layered cream
            halo so it reads on the busy ice texture. */}
        <p className="font-display text-xl leading-snug tracking-wide text-[color:var(--color-grenat)] [text-shadow:0_0_1px_rgba(243,235,217,1),0_0_6px_rgba(243,235,217,0.95),0_2px_24px_rgba(243,235,217,0.9)] md:text-2xl">
          {lede}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 1.1, ease: EASE }}
        className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
      >
        <PrimaryCta href={href}>{cta}</PrimaryCta>
        <SecondaryCta href="/contact" location={location}>
          Demander un devis
        </SecondaryCta>
      </motion.div>
    </>
  );
}

function PrimaryCta({
  href,
  location,
  children,
}: {
  href: string;
  location?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={location ? () => track("devis_cta_click", { location }) : undefined}
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-8 py-4 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
      <span className="relative">{children}</span>
      <span className="relative h-[1px] w-6 bg-current transition-all duration-500 group-hover:w-10" />
    </Link>
  );
}

function SecondaryCta({
  href,
  location,
  children,
}: {
  href: string;
  location?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={location ? () => track("devis_cta_click", { location }) : undefined}
      className="inline-flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]"
    >
      <span className="h-[1px] w-6 bg-current" />
      {children}
    </Link>
  );
}
