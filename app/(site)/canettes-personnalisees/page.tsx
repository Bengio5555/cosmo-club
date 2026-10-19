import type { Metadata } from "next";
import { CanettesHero } from "@/components/canettes/CanettesHero";
import { RecettesSection } from "@/components/canettes/RecettesSection";
import { FormulesSection } from "@/components/canettes/FormulesSection";
import { ProcessSection } from "@/components/canettes/ProcessSection";
import { CanSticker } from "@/components/canettes/CanSticker";
import { CtaDevis } from "@/components/home/CtaDevis";
import { FaqSection, buildFaqLd } from "@/components/site/FaqSection";
import { getImagePath } from "@/lib/server/imagesConfig";
import { faq, formules, paliers } from "@/lib/content/canettes";
import { site } from "@/lib/site";

const SLUG = "/canettes-personnalisees";
const URL = `${site.url}${SLUG}`;

// Static fallbacks ; the admin can replace each one from
// /dashboard/images (page « canettes », slots hero / recettes).
const FALLBACKS = {
  hero: "/brand/canettes/cosmo-cans-landscape-v2.jpg",
  recettes: "/brand/canettes/cosmo-cans-trio.jpg",
};

export const metadata: Metadata = {
  title: "Mocktail in a can — canettes personnalisées sans alcool, Paris",
  description:
    "Canettes transparentes 25 cl à votre logo, recettes sans alcool signées Cosmo Club, scellées le jour même. Livrées dès 200 canettes, installées sur glace ou servies en direct. À partir de 6 € HT la canette, 5,50 € HT dès 500, 5 € HT dès 1 000.",
  keywords: [
    "mocktail in a can",
    "canette personnalisée",
    "canette personnalisée événement",
    "canette personnalisée logo",
    "mocktail canette Paris",
    "goodies boisson événement",
    "canette transparente personnalisée",
    "cadeau client boisson personnalisée",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Mocktail in a can — Cosmo Club Paris",
    description:
      "La canette transparente à votre logo : recettes sans alcool, garniture visible, scellée le jour même. dès 200 canettes.",
    url: SLUG,
    type: "website",
  },
};

const faqLd = buildFaqLd(URL, [...faq]);

// Service + OfferCatalog : une Offer par formule avec son prix d'appel
// (« à partir de », donc minPrice) et la grille dégressive de la
// canette en PriceSpecification. Prix HT, le devis reste obligatoire.
const serviceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${URL}#service`,
  name: "Mocktail in a can — canettes personnalisées sans alcool",
  alternateName: "Canettes personnalisées Cosmo Club Paris",
  description:
    "Canettes transparentes 25 cl personnalisées au logo du client, remplies d'une recette sans alcool créée par Cosmo Club, garniture visible, scellées le jour même. Livrées dès 200 canettes, installées sur glace ou servies avec sertissage en direct, à Paris et en Île-de-France. Version avec alcool sur demande, sur devis.",
  serviceType: "Canettes personnalisées événementielles",
  provider: { "@id": `${site.url}/#organization` },
  areaServed: [
    { "@type": "City", name: "Paris" },
    { "@type": "AdministrativeArea", name: "Île-de-France" },
  ],
  url: URL,
  image: `${site.url}${FALLBACKS.hero}`,
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: `${site.url}/contact`,
    servicePhone: site.phone,
  },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Formules Mocktail in a can",
    itemListElement: formules.map((f) => ({
      "@type": "Offer",
      name: `Formule ${f.name}`,
      description: `${f.tagline} ${f.desc}`,
      url: `${URL}#formules`,
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "PriceSpecification",
        minPrice: f.fromHt,
        priceCurrency: "EUR",
        valueAddedTaxIncluded: false,
        ...(f.fromUnit === "canette"
          ? {
              unitText: "canette",
              eligibleQuantity: {
                "@type": "QuantitativeValue",
                minValue: f.minCans,
                unitText: "canette",
              },
            }
          : {
              description: f.priceNote,
            }),
      },
      eligibleQuantity: {
        "@type": "QuantitativeValue",
        minValue: f.minCans,
        unitText: "canette",
      },
      availability: "https://schema.org/InStock",
      areaServed: "Paris, Île-de-France",
    })),
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "EUR",
    lowPrice: Math.min(...paliers.map((p) => p.ht)),
    highPrice: Math.max(...paliers.map((p) => p.ht)),
    offerCount: paliers.length,
    description:
      "Prix HT de la canette selon la quantité : " +
      paliers.map((p) => `${p.range} ${p.ht.toLocaleString("fr-FR")} €`).join(", ") +
      ". Création du visuel offerte.",
  },
};

const breadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
    { "@type": "ListItem", position: 2, name: "Mocktail in a can", item: URL },
  ],
};

const ld = (obj: unknown) => JSON.stringify(obj).replace(/</g, "\\u003c");

export default async function CanettesPage() {
  // Resolved server-side so admin uploads ship in the SSR HTML, same
  // pattern as every other hero (no fallback → upload swap on hydrate).
  const [heroSrc, recettesSrc] = await Promise.all([
    getImagePath("canettes", "hero", FALLBACKS.hero),
    getImagePath("canettes", "recettes", FALLBACKS.recettes),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqLd) }} />
      <CanettesHero heroSrc={heroSrc} />
      <RecettesSection imageSrc={recettesSrc} />
      <CanSticker
        clips={{
          "litchi-rose": { webm: "/brand/canettes/spin-litchi-rose.webm", mov: "/brand/canettes/spin-litchi-rose.mov", poster: "/brand/canettes/spin-litchi-rose.png" },
          "framboise-hibiscus": { webm: "/brand/canettes/spin-framboise-hibiscus.webm", mov: "/brand/canettes/spin-framboise-hibiscus.mov", poster: "/brand/canettes/spin-framboise-hibiscus.png" },
          "coco-peche-aloe": { webm: "/brand/canettes/spin-coco-peche-aloe.webm", mov: "/brand/canettes/spin-coco-peche-aloe.mov", poster: "/brand/canettes/spin-coco-peche-aloe.png" },
        }}
      />
      <FormulesSection />
      <ProcessSection />
      <FaqSection items={[...faq]} />
      <CtaDevis />
    </>
  );
}
