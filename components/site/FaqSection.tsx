import { Reveal } from "@/components/motion/Reveal";

export type FaqItem = { q: string; a: string };

/**
 * FAQ accordion in the exact style of the LandingPage FAQ block, made
 * reusable for pages that don't go through LandingPage (/barista and
 * the /bar-a-cocktails hub). Emit the matching FAQPage JSON-LD from the
 * page itself (see buildFaqLd) — kept separate so pages control their
 * own schema graph.
 */
export function buildFaqLd(canonicalUrl: string, items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export function FaqSection({ items }: { items: FaqItem[] }) {
  return (
    <section className="bg-[color:var(--color-cream)] py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 md:px-10">
        <Reveal>
          <p className="eyebrow mb-6">
            <span className="rule" />
            Questions fréquentes
          </p>
          <h2 className="font-display text-[7vw] leading-[1] text-[color:var(--color-ink-text)] md:text-[3.5vw]">
            Tout ce que vous vous{" "}
            <span className="font-accent italic text-[color:var(--color-grenat)]">
              demandez
            </span>
            .
          </h2>
        </Reveal>
        <div className="mt-12 divide-y divide-[color:var(--color-espresso)]/15 border-y border-[color:var(--color-espresso)]/15">
          {items.map((item) => (
            <details
              key={item.q}
              className="group py-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-start justify-between gap-6 text-left">
                <h3 className="font-display text-lg text-[color:var(--color-ink-text)] md:text-xl">
                  {item.q}
                </h3>
                <span
                  aria-hidden
                  className="mt-2 inline-block h-px w-6 shrink-0 bg-[color:var(--color-grenat)] transition-transform duration-300 group-open:rotate-90"
                />
              </summary>
              <p className="mt-4 max-w-2xl whitespace-pre-line leading-relaxed text-[color:var(--color-espresso)]/85">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
