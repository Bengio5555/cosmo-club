import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Mentions légales — Cosmo Club Paris",
  description:
    "Mentions légales du site cosmoclub.fr : éditeur, hébergeur, propriété intellectuelle et contact.",
  alternates: { canonical: "/mentions-legales" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Mentions légales — Cosmo Club Paris",
    description:
      "Mentions légales du site cosmoclub.fr : éditeur, hébergeur, propriété intellectuelle et contact.",
    url: "/mentions-legales",
    type: "website",
  },
};

/**
 * Mentions légales — obligation LCEN (art. 6-III). Static legal page;
 * the company identifiers mirror the legal snapshot used on invoices
 * (settings table), hardcoded here so the page needs no DB round-trip.
 * Update both places if the company details ever change.
 */
export default function MentionsLegalesPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-10 border-b border-[color:var(--color-ash)]/40 pb-8">
        <p className="font-accent text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-or)]">
          Informations légales
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-[color:var(--color-ink-text)] md:text-5xl">
          Mentions légales
        </h1>
      </header>

      <div className="legal-prose space-y-8 text-[15px] leading-relaxed text-[color:var(--color-espresso)]">
        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Éditeur du site
          </h2>
          <p>
            Le site <strong>cosmoclub.fr</strong> est édité par{" "}
            <strong>COSMO CLUB PARIS</strong>, société par actions simplifiée
            (SAS), dont le siège social est situé au 26&nbsp;rue Bosquet,
            75007&nbsp;Paris, France.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>SIRET&nbsp;: 987&nbsp;377&nbsp;314&nbsp;00016</li>
            <li>TVA intracommunautaire&nbsp;: FR80987377314</li>
            <li>
              Email&nbsp;:{" "}
              <a
                href="mailto:contact@cosmoclub.fr"
                className="text-[color:var(--color-grenat)] underline underline-offset-2"
              >
                contact@cosmoclub.fr
              </a>
            </li>
            <li>Téléphone&nbsp;: +33&nbsp;7&nbsp;75&nbsp;74&nbsp;49&nbsp;77</li>
          </ul>
          <p className="mt-3">
            Directrice de la publication&nbsp;: Yvanna Harrouche.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Hébergement
          </h2>
          <p>
            Le site est hébergé par <strong>Vercel Inc.</strong>, 440&nbsp;N
            Barranca Avenue&nbsp;#4133, Covina, CA&nbsp;91723, États-Unis —{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              vercel.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Propriété intellectuelle
          </h2>
          <p>
            L&apos;ensemble des contenus du site (textes, photographies,
            identité visuelle, logos, cartes de cocktails) est la propriété
            exclusive de COSMO CLUB PARIS, sauf mention contraire. Toute
            reproduction, représentation ou diffusion, totale ou partielle,
            sans autorisation écrite préalable est interdite.
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Données personnelles
          </h2>
          <p>
            Les modalités de collecte et de traitement des données
            personnelles sont détaillées dans notre{" "}
            <Link
              href="/politique-de-confidentialite"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              politique de confidentialité
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Conditions de vente
          </h2>
          <p>
            Les prestations de {site.name} sont régies par nos{" "}
            <Link
              href="/cgv"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              conditions générales de vente
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Consommation d&apos;alcool
          </h2>
          <p>
            L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer
            avec modération. La vente d&apos;alcool est interdite aux mineurs
            de moins de 18&nbsp;ans.
          </p>
        </section>
      </div>
    </article>
  );
}
