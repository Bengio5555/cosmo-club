import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { DevisWizard } from "@/components/form/DevisWizard";
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

export default function Page() {
  return (
    <>
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
                  <a
                    href={`mailto:${site.email}`}
                    className="mt-1 block font-display text-lg text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
                  >
                    {site.email}
                  </a>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Téléphone
                  </p>
                  <a
                    href={`tel:${site.phone}`}
                    className="mt-1 block font-display text-lg text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
                  >
                    {site.phoneDisplay}
                  </a>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">
                    Instagram
                  </p>
                  <a
                    href={site.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-2 font-display text-lg text-[color:var(--color-ink-text)] hover:text-[color:var(--color-grenat)]"
                  >
                    {site.instagramHandle} <span aria-hidden>↗</span>
                  </a>
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
