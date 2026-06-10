"use client";

import { useRef } from "react";
import { testimonials } from "@/lib/testimonials";

// Five gold stars — decorative; rating is also stated in a sr-only label.
function Stars() {
  return (
    <div aria-hidden className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="h-3.5 w-3.5 fill-[color:var(--color-or-deep)]"
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
      className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-grenat)]/30 text-[color:var(--color-grenat)] transition hover:bg-[color:var(--color-grenat)]/10 active:scale-95"
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
 * horizontal carousel with prev/next controls. Light cream surface to
 * match the adjacent ClientsMarquee band. Visible social proof + citable
 * structured content for AI search; the matching AggregateRating/Review
 * JSON-LD lives on the home page's business node, from the same data.
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
      className="border-y border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream)] py-16 text-[color:var(--color-ink-text)] md:py-20"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Header: rating on the left, nav arrows on the right */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
              <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-grenat)] opacity-70" />
              Avis clients
            </p>
            <h2
              id="avis-title"
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-display text-3xl leading-tight md:text-4xl"
            >
              5,0 sur Google
              <Stars />
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
              className="flex h-[280px] w-[300px] shrink-0 snap-start flex-col rounded-2xl border border-[color:var(--color-ash-warm)] bg-[color:var(--color-bone)] p-6 shadow-[0_1px_3px_rgba(42,31,20,0.06)] sm:w-[340px]"
            >
              <div className="flex items-center justify-between gap-3">
                <Stars />
                {t.context && (
                  <span className="rounded-full border border-[color:var(--color-or-deep)]/40 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[color:var(--color-or-deep)]">
                    {t.context}
                  </span>
                )}
              </div>
              <span className="sr-only">Note : 5 étoiles sur 5.</span>
              <blockquote className="mt-4 flex-1 overflow-hidden text-[14px] leading-relaxed text-[color:var(--color-espresso)] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:6]">
                {t.body}
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between border-t border-[color:var(--color-ash-warm)] pt-4 text-sm">
                <span className="font-medium text-[color:var(--color-ink-text)]">
                  {t.author}
                </span>
                <span className="text-[color:var(--color-espresso)]/55">
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
