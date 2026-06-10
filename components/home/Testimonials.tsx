"use client";

import { useRef } from "react";
import { testimonials, reviewsAggregate } from "@/lib/testimonials";

// Five gold stars — decorative; rating is also stated in a sr-only label.
function Stars() {
  return (
    <div aria-hidden className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 fill-[color:var(--color-or)]"
        >
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.6l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </div>
  );
}

function Arrow({
  dir,
  onClick,
}: {
  dir: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "left" ? "Avis précédents" : "Avis suivants"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-or)]/30 text-[color:var(--color-or)] transition hover:bg-[color:var(--color-or)]/10 active:scale-95"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth={1.8}>
        {dir === "left" ? (
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
    </button>
  );
}

/**
 * Real 5-star Google reviews (see lib/testimonials.ts) shown as a compact
 * horizontal carousel with prev/next controls. Visible social proof +
 * citable structured content for AI search; the matching
 * AggregateRating/Review JSON-LD lives on the home page's business node,
 * sourced from the same data file.
 */
export function Testimonials() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollByCard = (dir: "left" | "right") => {
    const track = trackRef.current;
    if (!track) return;
    // One card + gap ≈ first child's width; fall back to 360px.
    const card = track.querySelector<HTMLElement>("[data-card]");
    const amount = (card?.offsetWidth ?? 340) + 20;
    track.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <section
      id="avis"
      aria-labelledby="avis-title"
      className="relative overflow-hidden bg-[color:var(--color-ink-text)] py-16 text-[color:var(--color-cream)] md:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 12% 0%, rgba(201,169,97,0.12), transparent 50%), radial-gradient(ellipse at 88% 100%, rgba(139,26,26,0.22), transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header: rating on the left, nav arrows on the right */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-or)]">
              <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-or)] opacity-70" />
              Ils nous ont fait confiance
            </p>
            <h2
              id="avis-title"
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-display text-3xl leading-tight md:text-4xl"
            >
              5,0 sur Google
              <span className="inline-flex items-center gap-2">
                <Stars />
                <span className="text-sm font-sans text-[color:var(--color-cream)]/65">
                  {reviewsAggregate.reviewCount} avis
                </span>
              </span>
            </h2>
          </div>

          <div className="hidden gap-3 md:flex">
            <Arrow dir="left" onClick={() => scrollByCard("left")} />
            <Arrow dir="right" onClick={() => scrollByCard("right")} />
          </div>
        </div>

        {/* Carousel track */}
        <div
          ref={trackRef}
          className="scrollbar-none mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2"
        >
          {testimonials.map((t) => (
            <figure
              key={t.author}
              data-card
              className="flex h-[280px] w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-[color:var(--color-or)]/15 bg-white/[0.04] p-6 backdrop-blur-sm sm:w-[340px]"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars />
                {t.context && (
                  <span className="rounded-full border border-[color:var(--color-or)]/25 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-or)]">
                    {t.context}
                  </span>
                )}
              </div>
              <span className="sr-only">Note : 5 étoiles sur 5.</span>
              <blockquote className="mt-4 flex-1 overflow-hidden text-[14px] leading-relaxed text-[color:var(--color-cream)]/90 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6]">
                {t.body}
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="font-medium text-[color:var(--color-cream)]">
                  {t.author}
                </span>
                <span className="text-[color:var(--color-cream)]/45">
                  {t.dateLabel}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Mobile arrows below the track */}
        <div className="mt-6 flex justify-center gap-3 md:hidden">
          <Arrow dir="left" onClick={() => scrollByCard("left")} />
          <Arrow dir="right" onClick={() => scrollByCard("right")} />
        </div>
      </div>
    </section>
  );
}
