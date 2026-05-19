import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { TrackedNextLink } from "@/components/analytics/TrackedNextLink";
import { site } from "@/lib/site";

/**
 * Config-driven SEO landing page. Each intent (mariage, anniversaire,
 * entreprise, barman privé, animation) ships its own copy + FAQ; the
 * shared layout below renders hero → intro → pillars → experience →
 * timeline → FAQ → internal links → CTA and emits Service + FAQPage
 * JSON-LD for the rich-result eligibility.
 *
 * Editorial constraints (memory project_seo.md):
 *  - No precise figures (no per-guest prices, no quantity rules)
 *  - No third-party spirit brand names unless permanent choice
 *  - No "trop tard / on n'accepte pas sous X" — always leave a door open
 *  - Premium tone, no industry-bashing
 */
export type LandingConfig = {
  /** Canonical path under /bar-a-cocktails or root, with leading slash. */
  slug: string;
  /** Exact target keyword for the H1. Drives the page's positioning. */
  h1: string;
  /** Optional italicized accent word inside the H1 (gold). */
  h1Accent?: string;
  /** One-line subheading shown below H1. */
  subtitle: string;
  /** Eyebrow label above H1 (small uppercase rule). */
  eyebrow: string;
  /** Hero background image — must exist in /public. */
  heroSrc: string;
  /** 2 paragraphs of intro prose. Each ~50-80 words. */
  intro: [string, string];
  /** 3-4 differentiator blocks. */
  pillars: { title: string; body: string }[];
  /** Long-form "ce que vous obtenez" section (~150-250 words across paragraphs). */
  experience: { title: string; paragraphs: string[] };
  /** 4-5 step timeline of how the engagement unfolds. */
  timeline: { label: string; body: string }[];
  /** 5-7 question/answer pairs. Drives the FAQPage schema. */
  faq: { q: string; a: string }[];
  /** Cross-link tiles to related landing pages / blog. */
  related: { href: string; label: string; desc: string }[];
  /** Service entity for JSON-LD. */
  serviceJsonLd: {
    name: string;
    description: string;
    serviceType: string;
  };
};

export function LandingPage({ config }: { config: LandingConfig }) {
  const canonicalUrl = `${site.url}${config.slug}`;

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${canonicalUrl}#service`,
    name: config.serviceJsonLd.name,
    description: config.serviceJsonLd.description,
    serviceType: config.serviceJsonLd.serviceType,
    provider: { "@id": `${site.url}/#business` },
    areaServed: [
      { "@type": "City", name: "Paris" },
      { "@type": "AdministrativeArea", name: "Île-de-France" },
    ],
    url: canonicalUrl,
    availableChannel: {
      "@type": "ServiceChannel",
      serviceUrl: `${site.url}/contact`,
      servicePhone: site.phone,
    },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity: config.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Bar à cocktails",
        item: `${site.url}/bar-a-cocktails`,
      },
      { "@type": "ListItem", position: 3, name: config.h1, item: canonicalUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-[color:var(--color-ink-text)] text-[color:var(--color-bone)]">
        <Image
          src={config.heroSrc}
          alt={config.h1}
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-65"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" aria-hidden />
        <div className="relative mx-auto flex min-h-[80vh] max-w-[1400px] flex-col justify-end px-6 pb-20 pt-32 md:px-10 md:pb-28">
          <Reveal>
            <p className="eyebrow mb-6"><span className="rule" />{config.eyebrow}</p>
            <h1 className="font-display text-balance text-[12vw] leading-[0.95] sm:text-[10vw] md:text-[6vw] lg:text-[5.5vw]">
              {config.h1Accent
                ? renderWithAccent(config.h1, config.h1Accent)
                : config.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-[color:var(--color-bone)]/80 md:text-xl">
              {config.subtitle}
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <TrackedNextLink
                event="devis_cta_click"
                location={`landing_hero_${config.slug.replace(/\//g, "_")}`}
                href="/contact"
                className="group inline-flex items-center gap-3 rounded-full bg-[color:var(--color-grenat)] px-9 py-4 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)]"
              >
                Demander un devis
                <span className="h-px w-8 bg-current transition-all duration-500 group-hover:w-14" />
              </TrackedNextLink>
              <TrackedAnchor
                event="phone_click"
                location={`landing_hero_${config.slug.replace(/\//g, "_")}`}
                href={`tel:${site.phone}`}
                className="inline-flex items-center gap-3 px-2 py-3 text-[11px] uppercase tracking-[0.3em] text-[color:var(--color-bone)]/80 hover:text-[color:var(--color-or)]"
              >
                <span className="h-px w-6 bg-current" />
                {site.phoneDisplay}
              </TrackedAnchor>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Intro ───────────────────────────────────────────── */}
      <section className="bg-[color:var(--color-cream-paper)] py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <Reveal>
            <p className="font-display text-3xl leading-snug text-[color:var(--color-ink-text)] md:text-4xl">
              {config.intro[0]}
            </p>
            <p className="mt-8 text-lg leading-relaxed text-[color:var(--color-espresso)]/85 md:text-xl">
              {config.intro[1]}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ─── Pillars ─────────────────────────────────────────── */}
      <section className="bg-[color:var(--color-cream)] py-24 md:py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Reveal>
            <p className="eyebrow mb-6"><span className="rule" />Pourquoi Cosmo Club</p>
            <h2 className="font-display text-[8vw] leading-[1] text-[color:var(--color-ink-text)] md:text-[4vw]">
              Quatre raisons de nous confier <span className="font-accent italic text-[color:var(--color-grenat)]">votre soirée</span>.
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-10 md:grid-cols-2">
            {config.pillars.map((p) => (
              <Reveal key={p.title}>
                <article className="border-l-2 border-[color:var(--color-grenat)]/40 pl-6">
                  <h3 className="font-display text-2xl text-[color:var(--color-ink-text)] md:text-3xl">
                    {p.title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-[color:var(--color-espresso)]/80">
                    {p.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Experience prose (long form for SEO depth) ─────── */}
      <section className="bg-[color:var(--color-cream-paper)] py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <Reveal>
            <p className="eyebrow mb-6"><span className="rule" />La prestation</p>
            <h2 className="font-display text-3xl leading-snug text-[color:var(--color-ink-text)] md:text-4xl">
              {config.experience.title}
            </h2>
            <div className="mt-10 space-y-6 text-lg leading-relaxed text-[color:var(--color-espresso)]/85 md:text-xl">
              {config.experience.paragraphs.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── Timeline ────────────────────────────────────────── */}
      <section className="bg-[color:var(--color-ink-text)] py-24 text-[color:var(--color-bone)] md:py-32">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10">
          <Reveal>
            <p className="eyebrow mb-6 text-[color:var(--color-bone)]/70">
              <span className="rule bg-[color:var(--color-bone)]/40" />Le déroulé
            </p>
            <h2 className="font-display text-[8vw] leading-[1] md:text-[4vw]">
              Comment ça se passe <span className="font-accent italic text-[color:var(--color-or)]">avec nous</span>.
            </h2>
          </Reveal>
          <ol className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {config.timeline.map((step, i) => (
              <Reveal key={i}>
                <li className="border-t border-[color:var(--color-bone)]/20 pt-5">
                  <p className="font-accent text-sm italic text-[color:var(--color-or)]">
                    N°{String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 font-display text-xl">{step.label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[color:var(--color-bone)]/70">
                    {step.body}
                  </p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────── */}
      <section className="bg-[color:var(--color-cream)] py-24 md:py-32">
        <div className="mx-auto max-w-3xl px-6 md:px-10">
          <Reveal>
            <p className="eyebrow mb-6"><span className="rule" />Questions fréquentes</p>
            <h2 className="font-display text-[7vw] leading-[1] text-[color:var(--color-ink-text)] md:text-[3.5vw]">
              Tout ce que vous vous <span className="font-accent italic text-[color:var(--color-grenat)]">demandez</span>.
            </h2>
          </Reveal>
          <div className="mt-12 divide-y divide-[color:var(--color-espresso)]/15 border-y border-[color:var(--color-espresso)]/15">
            {config.faq.map((item) => (
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

      {/* ─── Related (internal linking) ─────────────────────── */}
      {config.related.length > 0 && (
        <section className="bg-[color:var(--color-cream-paper)] py-24 md:py-32">
          <div className="mx-auto max-w-[1400px] px-6 md:px-10">
            <Reveal>
              <p className="eyebrow mb-6"><span className="rule" />À voir aussi</p>
              <h2 className="font-display text-[6vw] leading-[1] text-[color:var(--color-ink-text)] md:text-[3vw]">
                D&apos;autres <span className="font-accent italic text-[color:var(--color-grenat)]">prestations</span>.
              </h2>
            </Reveal>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {config.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="group block border-l-2 border-[color:var(--color-grenat)]/40 bg-[color:var(--color-cream)] p-6 transition-colors hover:border-[color:var(--color-grenat)] hover:bg-[color:var(--color-cream-dark)]"
                >
                  <h3 className="font-display text-lg text-[color:var(--color-ink-text)] transition-colors group-hover:text-[color:var(--color-grenat)] md:text-xl">
                    {r.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-espresso)]/75">
                    {r.desc}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-grenat)]">
                    Découvrir <span className="h-px w-6 bg-current transition-all group-hover:w-10" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Final CTA ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[color:var(--color-cream-paper)] py-24 md:py-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,26,26,0.28), transparent 60%), radial-gradient(ellipse 40% 40% at 80% 20%, rgba(201,169,97,0.12), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[1400px] px-6 text-center md:px-10">
          <Reveal>
            <p className="eyebrow mb-8 justify-center"><span className="rule" />Prenons rendez-vous</p>
            <h2 className="font-display text-[11vw] leading-[0.95] text-balance text-[color:var(--color-ink-text)] sm:text-[13vw] md:text-[8vw]">
              Parlons de <span className="font-accent italic text-[color:var(--color-grenat)]">votre</span> événement.
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-lg text-[color:var(--color-espresso)]/75 md:text-xl">
              Racontez-nous le moment que vous préparez. Nous composons une
              offre sur mesure et revenons vers vous sous 24 h.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <TrackedNextLink
                event="devis_cta_click"
                location={`landing_footer_${config.slug.replace(/\//g, "_")}`}
                href="/contact"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-10 py-5 text-[12px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
                <span className="relative">Demander un devis</span>
                <span className="relative h-px w-8 bg-current transition-all duration-500 group-hover:w-14" />
              </TrackedNextLink>
              <TrackedAnchor
                event="phone_click"
                location={`landing_footer_${config.slug.replace(/\//g, "_")}`}
                href={`tel:${site.phone}`}
                className="inline-flex items-center gap-3 px-4 py-3 text-[12px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/80 hover:text-[color:var(--color-grenat)]"
              >
                <span className="h-px w-6 bg-current" />
                {site.phoneDisplay}
              </TrackedAnchor>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function renderWithAccent(text: string, accent: string) {
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + accent.length);
  const after = text.slice(idx + accent.length);
  return (
    <>
      {before}
      <span className="font-accent italic text-[color:var(--color-or)]">{match}</span>
      {after}
    </>
  );
}
