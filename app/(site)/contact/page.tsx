import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DevisWizard } from "@/components/form/DevisWizard";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Devis & contact — Cosmo Club Paris, bar à cocktails événementiel",
  description:
    "Demandez votre devis sur-mesure en 4 questions, réponse sous 48h. Bar à cocktails et barista événementiel à Paris et en Île-de-France pour mariages, corporate et soirées privées.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Devis & contact — Cosmo Club Paris",
    description: "Devis sur-mesure en 4 questions, réponse sous 48h.",
    url: "/contact",
    type: "website",
  },
};

// FAQ JSON-LD targeted at AI Overviews / ChatGPT / Perplexity. The Q&A
// format is the structure these engines preferentially cite — keeping
// answers short, factual and self-contained.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Quelle est la zone d'intervention de Cosmo Club Paris ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Cosmo Club Paris intervient à Paris et dans toute l'Île-de-France pour les mariages, événements corporate, défilés et soirées privées. Des déplacements ponctuels sont possibles dans le reste de la France pour des événements de prestige, étudiés au cas par cas.",
      },
    },
    {
      "@type": "Question",
      name: "Sous quel délai Cosmo Club répond-il à une demande de devis ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Un devis sur-mesure est envoyé sous 48 heures après la demande, à l'adresse contact@cosmoclub.fr ou via le formulaire en ligne du site cosmoclub.fr.",
      },
    },
    {
      "@type": "Question",
      name: "Quels types d'événements Cosmo Club prend-il en charge ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Cosmo Club conçoit des prestations bar à cocktails et barista pour les mariages, séminaires et soirées d'entreprise, défilés, lancements de marque et soirées privées premium. Chaque carte est composée sur-mesure pour l'événement.",
      },
    },
    {
      "@type": "Question",
      name: "Cosmo Club propose-t-il des options sans alcool ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Oui — chaque carte intègre systématiquement des mocktails travaillés au même niveau que les cocktails alcoolisés : créations originales, présentations soignées, jamais du soda coloré.",
      },
    },
    {
      "@type": "Question",
      name: "Cosmo Club Paris a-t-il un bar physique ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "Non, Cosmo Club Paris est un service événementiel mobile, pas un bar fixe. L'équipe se déplace sur le lieu choisi par le client à Paris ou en Île-de-France, sur rendez-vous.",
      },
    },
    {
      "@type": "Question",
      name: "Quelles langues sont parlées par l'équipe Cosmo Club ?",
      acceptedAnswer: {
        "@type": "Answer",
        text:
          "L'équipe Cosmo Club assure le service en français et en anglais, ce qui permet de prendre en charge sereinement les événements internationaux à Paris.",
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <PageHeader
        eyebrow="Prenons rendez-vous"
        title="Parlons de votre"
        italicWord="événement."
        description="Quatre questions, deux minutes. Nous revenons sous 48h avec une proposition sur-mesure, pensée pour votre moment."
      />

      <section className="relative bg-[color:var(--color-ink-soft)] pb-24 pt-6 md:pb-32">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:gap-16 md:px-10">
          <DevisWizard />
          <aside className="space-y-10 text-[color:var(--color-espresso)] md:pl-6">
            <div>
              <p className="eyebrow"><span className="rule" />Coordonnées</p>
              <div className="mt-6 space-y-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Adresse
                  </p>
                  <p className="mt-1 font-display text-xl text-[color:var(--color-ink-text)]">
                    {site.address.city}
                  </p>
                  <p className="text-sm text-[color:var(--color-espresso)]/75">
                    {site.address.detail}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Email
                  </p>
                  <TrackedAnchor
                    event="email_click"
                    location="contact_page"
                    href={`mailto:${site.email}`}
                    className="mt-1 block font-display text-lg text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
                  >
                    {site.email}
                  </TrackedAnchor>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Téléphone
                  </p>
                  <TrackedAnchor
                    event="phone_click"
                    location="contact_page"
                    href={`tel:${site.phone}`}
                    className="mt-1 block font-display text-lg text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
                  >
                    {site.phoneDisplay}
                  </TrackedAnchor>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Instagram
                  </p>
                  <TrackedAnchor
                    event="instagram_click"
                    location="contact_page"
                    href={site.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 font-display text-lg text-[color:var(--color-ink-text)] hover:text-[color:var(--color-grenat)]"
                  >
                    {site.instagramHandle} <span aria-hidden>↗</span>
                  </TrackedAnchor>
                </div>
              </div>
            </div>

            <div className="hairline" />

            <div>
              <p className="eyebrow"><span className="rule" />Horaires</p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-espresso)]/20 pb-3">
                  <dt className="text-[color:var(--color-espresso)]/75">Lun — Ven</dt>
                  <dd className="text-[color:var(--color-ink-text)]">10h — 19h</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-[color:var(--color-espresso)]/20 pb-3">
                  <dt className="text-[color:var(--color-espresso)]/75">Événements</dt>
                  <dd className="text-[color:var(--color-ink-text)]">7j/7</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[color:var(--color-espresso)]/75">Réponse devis</dt>
                  <dd className="text-[color:var(--color-ink-text)]">Sous 48h</dd>
                </div>
              </dl>
            </div>

            <div className="hairline" />

            <div>
              <p className="eyebrow"><span className="rule" />Ce qu'on propose</p>
              <ul className="mt-6 space-y-2 text-sm">
                {[
                  "Bar à cocktails signature",
                  "Stands barista & latte art",
                  "Cocktails en bouteille",
                  "Juice bar & mocktails",
                  "Création sur-mesure",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-[4px] w-[4px] rounded-full bg-[color:var(--color-or)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
