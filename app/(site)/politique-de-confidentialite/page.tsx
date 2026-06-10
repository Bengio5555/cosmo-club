import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Cosmo Club Paris",
  description:
    "Comment Cosmo Club Paris collecte, utilise et protège vos données personnelles (formulaire de devis, mesure d'audience). Vos droits RGPD.",
  alternates: { canonical: "/politique-de-confidentialite" },
  robots: { index: true, follow: true },
};

/**
 * Politique de confidentialité (RGPD). Documents the real data flows
 * of the public site: the devis/contact form (→ Supabase, EU-Paris),
 * transactional email (Resend), analytics (GA4, Vercel Analytics) and
 * error monitoring (Sentry, EU, no PII). Keep in sync if a new
 * processor or collection point is added.
 */
export default function PolitiqueConfidentialitePage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-10 border-b border-[color:var(--color-ash)]/40 pb-8">
        <p className="font-accent text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-or)]">
          Données personnelles
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-[color:var(--color-ink-text)] md:text-5xl">
          Politique de confidentialité
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-espresso)]/70">
          Dernière mise à jour&nbsp;: juin 2026.
        </p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-[color:var(--color-espresso)]">
        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Responsable du traitement
          </h2>
          <p>
            COSMO CLUB PARIS (SAS), 26&nbsp;rue Bosquet, 75007&nbsp;Paris —{" "}
            <a
              href="mailto:contact@cosmoclub.fr"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              contact@cosmoclub.fr
            </a>
            . Voir aussi nos{" "}
            <Link
              href="/mentions-legales"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              mentions légales
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Données collectées et finalités
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Formulaire de devis / contact</strong>&nbsp;: nom,
              email, téléphone, type et détails de l&apos;événement (date,
              lieu, nombre d&apos;invités). Finalité&nbsp;: répondre à votre
              demande et établir une proposition commerciale. Base
              légale&nbsp;: mesures précontractuelles à votre demande
              (art.&nbsp;6.1.b RGPD).
            </li>
            <li>
              <strong>Gestion commerciale et facturation</strong> (si la
              prestation est confirmée)&nbsp;: coordonnées de facturation,
              documents contractuels. Base légale&nbsp;: exécution du contrat
              et obligations légales comptables.
            </li>
            <li>
              <strong>Mesure d&apos;audience</strong>&nbsp;: statistiques de
              navigation anonymisées via Google Analytics&nbsp;4 et Vercel
              Analytics. Base légale&nbsp;: intérêt légitime / consentement
              selon la configuration de votre navigateur.
            </li>
            <li>
              <strong>Surveillance technique</strong>&nbsp;: journaux
              d&apos;erreurs techniques (Sentry, hébergé dans l&apos;Union
              européenne), configurés sans collecte d&apos;adresse IP ni de
              données d&apos;identification.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Destinataires et sous-traitants
          </h2>
          <p>
            Vos données ne sont ni vendues ni louées. Elles sont traitées par
            notre équipe et nos sous-traitants techniques&nbsp;:
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> — base de données hébergée dans
              l&apos;Union européenne (région Paris).
            </li>
            <li>
              <strong>Vercel</strong> — hébergement du site (clauses
              contractuelles types pour les transferts hors UE).
            </li>
            <li>
              <strong>Resend</strong> — envoi des emails transactionnels
              (devis, confirmations).
            </li>
            <li>
              <strong>Google</strong> — mesure d&apos;audience (GA4).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Durées de conservation
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Demandes de devis sans suite&nbsp;: 3&nbsp;ans après le dernier
              contact.
            </li>
            <li>
              Documents contractuels et factures&nbsp;: 10&nbsp;ans
              (obligation légale comptable).
            </li>
            <li>Données de mesure d&apos;audience&nbsp;: 14&nbsp;mois maximum.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-xl text-[color:var(--color-ink-text)]">
            Vos droits
          </h2>
          <p>
            Conformément au RGPD et à la loi Informatique et Libertés, vous
            disposez d&apos;un droit d&apos;accès, de rectification,
            d&apos;effacement, de limitation, d&apos;opposition et de
            portabilité sur vos données. Pour l&apos;exercer, écrivez-nous
            à{" "}
            <a
              href="mailto:contact@cosmoclub.fr"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              contact@cosmoclub.fr
            </a>
            . Vous pouvez également introduire une réclamation auprès de la
            CNIL (
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noreferrer"
              className="text-[color:var(--color-grenat)] underline underline-offset-2"
            >
              cnil.fr
            </a>
            ).
          </p>
        </section>
      </div>
    </article>
  );
}
