import { Reveal } from "@/components/motion/Reveal";
import { testimonials, reviewsAggregate } from "@/lib/testimonials";

// Five gold stars — decorative; the rating is also conveyed in text for
// screen readers via the visually-hidden label on each card.
function Stars() {
  return (
    <div aria-hidden className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-[color:var(--color-or-deep)]"
        >
          <path d="M10 1.5l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.6l-4.94 2.6.94-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </div>
  );
}

/**
 * Real 5-star Google reviews (see lib/testimonials.ts). Visible social
 * proof for visitors + a citable, structured testimonial block that AI
 * search engines (ChatGPT, Perplexity, AI Overviews) read directly from
 * the page. The matching AggregateRating/Review JSON-LD lives on the home
 * page's business node, sourced from the same data file.
 */
export function Testimonials() {
  return (
    <section
      id="avis"
      aria-labelledby="avis-title"
      className="relative overflow-hidden bg-[color:var(--color-ink)] py-24 text-[color:var(--color-cream)] md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 15% 10%, rgba(201,169,97,0.14), transparent 55%), radial-gradient(ellipse at 85% 90%, rgba(139,26,26,0.18), transparent 55%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="flex flex-col items-center text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-or)]">
            <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-or)] opacity-70" />
            Ils nous ont fait confiance
            <span className="ml-3 inline-block h-px w-12 align-middle bg-[color:var(--color-or)] opacity-70" />
          </p>
          <h2
            id="avis-title"
            className="mt-6 font-display text-3xl leading-tight md:text-5xl"
          >
            5,0 sur Google
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <Stars />
            <span className="text-sm text-[color:var(--color-cream)]/70">
              {reviewsAggregate.ratingValue.toFixed(1)} / 5 ·{" "}
              {reviewsAggregate.reviewCount} avis Google
            </span>
          </div>
        </div>

        <div className="mt-16 columns-1 gap-6 md:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid">
          {testimonials.map((t, i) => (
            <Reveal
              key={t.author}
              delay={i * 60}
              className="rounded-2xl border border-[color:var(--color-or)]/15 bg-white/[0.03] p-6 backdrop-blur-sm md:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <Stars />
                {t.context && (
                  <span className="rounded-full border border-[color:var(--color-or)]/25 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-or)]">
                    {t.context}
                  </span>
                )}
              </div>
              <span className="sr-only">Note : 5 étoiles sur 5.</span>
              <blockquote className="mt-5 text-[15px] leading-relaxed text-[color:var(--color-cream)]/90">
                {t.body}
              </blockquote>
              <figcaption className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
                <span className="font-medium text-[color:var(--color-cream)]">
                  {t.author}
                </span>
                <span className="text-[color:var(--color-cream)]/50">
                  {t.dateLabel}
                </span>
              </figcaption>
            </Reveal>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-[color:var(--color-cream)]/55">
          Avis vérifiés publiés sur notre fiche Google&nbsp;Business.
        </p>
      </div>
    </section>
  );
}
