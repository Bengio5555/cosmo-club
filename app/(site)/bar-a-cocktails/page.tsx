import type { Metadata } from "next";
import { BarHero } from "@/components/bar/BarHero";
import { MixologieIntro } from "@/components/bar/MixologieIntro";
import { StickyCartes } from "@/components/bar/StickyCartes";
import { ShotsSection } from "@/components/bar/ShotsSection";
import { BottlesSection } from "@/components/bar/BottlesSection";
import { AlcoholFreeSection } from "@/components/bar/AlcoholFreeSection";
import { BarsSection } from "@/components/bar/BarsSection";
import { IntentLinks } from "@/components/landing/IntentLinks";
import { CtaDevis } from "@/components/home/CtaDevis";
import heroBarImg from "@/public/brand/ai/hero-bar.png";
import { getImagePath } from "@/lib/server/imagesConfig";
import { site } from "@/lib/site";
import {
  FaqSection,
  buildFaqLd,
  type FaqItem,
} from "@/components/site/FaqSection";

// FAQ — facts sourced from published site content only (cartes, bar
// formats, mocktails, in-a-bottle, IDF coverage, card lock policy).
const barFaq: FaqItem[] = [
  {
    q: "Quelles cartes de cocktails proposez-vous ?",
    a: "Quatre cartes signatures : Classico (les essentiels exécutés sans compromis), Cosmo (nos relectures signatures), Émotion (compositions narratives) et Création (cocktails écrits sur-mesure pour votre événement). Chaque carte est ajustée à votre format, votre saison et vos invités.",
  },
  {
    q: "Quel format de bar choisir pour mon événement ?",
    a: "Nous installons quatre formats : Comptoir (intégré à votre espace), Îlot (bar central autonome), Scène (le bar spectacle, pensé pour être photographié) et Sur-mesure (brandable : sticker pleine façade, néon, glaçons gravés). Le choix dépend du lieu, du nombre d'invités et de la place disponible — nous vous conseillons au devis.",
  },
  {
    q: "Proposez-vous des cocktails sans alcool ?",
    a: "Oui. Nos cartes de mocktails sont construites avec la même exigence que la carte alcoolisée : ingrédients premium, vraie identité de goût, présentation identique. Idéal pour des événements inclusifs, les femmes enceintes ou un public professionnel.",
  },
  {
    q: "Peut-on repartir avec des cocktails ou en offrir aux invités ?",
    a: "Avec nos cocktails « in a bottle », oui : trois formats (20 cl, 50 cl et 1 L), bouteilles étiquetées au nom de votre entreprise ou de votre couple. Une façon de prolonger l'événement en cadeau d'invité.",
  },
  {
    q: "Où intervenez-vous et jusqu'à quand peut-on modifier la carte ?",
    a: "Nous intervenons à Paris et dans toute l'Île-de-France. La carte des cocktails est verrouillée 15 jours avant l'événement ; au-delà, nous proposons les ajustements compatibles avec notre approvisionnement.",
  },
  {
    q: "L'équipe et le matériel sont-ils inclus ?",
    a: "Oui. La prestation comprend les mixologues (sélectionnés sur la technique et la posture), le bar, la verrerie, les ingrédients, la livraison, l'installation et la reprise du matériel. Assurance RC professionnelle et licence III — attestations fournies sur demande au lieu de réception.",
  },
];

const barFaqLd = buildFaqLd(`${site.url}/bar-a-cocktails`, barFaq);

// Hub-page structured data: a Service node with an OfferCatalog
// pointing at the three specialised landing pages, plus breadcrumbs.
// The child pages already emit their own Service via LandingPage.tsx;
// this hub was schema-less besides the global Organization.
const barServiceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${site.url}/bar-a-cocktails#service`,
  name: "Bar à cocktails événementiel — Cosmo Club Paris",
  description:
    "Bar à cocktails mobile événementiel haut de gamme à Paris et en Île-de-France pour mariages, soirées corporate, anniversaires et événements privés.",
  serviceType: "Bar à cocktails événementiel",
  provider: { "@id": `${site.url}/#organization` },
  areaServed: [
    { "@type": "City", name: "Paris" },
    { "@type": "AdministrativeArea", name: "Île-de-France" },
  ],
  url: `${site.url}/bar-a-cocktails`,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Formules bar à cocktails",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Bar à cocktails mariage",
          url: `${site.url}/bar-a-cocktails/mariage`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Bar à cocktails entreprise",
          url: `${site.url}/bar-a-cocktails/entreprise`,
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Bar à cocktails anniversaire",
          url: `${site.url}/bar-a-cocktails/anniversaire`,
        },
      },
    ],
  },
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: `${site.url}/contact`,
    servicePhone: site.phone,
  },
};

const barBreadcrumbLd = {
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
  ],
};

export const metadata: Metadata = {
  title: "Bar à cocktails événementiel à Paris",
  description:
    "Bar à cocktails mobile premium à Paris et en Île-de-France : quatre cartes signatures, cocktails sur-mesure et bars modulables pour vos événements.",
  keywords: [
    "bar à cocktails événementiel",
    "bar à cocktails mariage Paris",
    "bar à cocktails entreprise Paris",
    "mixologie événementielle",
    "barman événementiel Paris",
    "bar mobile Paris",
    "cocktails sur mesure",
  ],
  alternates: { canonical: "/bar-a-cocktails" },
  openGraph: {
    title: "Bar à cocktails événementiel — Cosmo Club Paris",
    description:
      "Bar à cocktails mobile premium pour vos événements à Paris et en Île-de-France.",
    url: "/bar-a-cocktails",
    type: "website",
  },
};

const BOTTLE_FALLBACKS: Array<[string, string]> = [
  ["bottle-20cl", "/brand/ai/bottle-20cl.png"],
  ["bottle-50cl", "/brand/ai/bottle-50cl.png"],
  ["bottle-1L", "/brand/ai/bottle-1L.png"],
];

export default async function Page() {
  // Resolve every image URL server-side so the SSR HTML already points
  // at the admin-uploaded versions — kills the static→admin flash.
  const [heroSrc, ...bottleSrcs] = await Promise.all([
    getImagePath("bar-a-cocktails", "hero", heroBarImg.src),
    ...BOTTLE_FALLBACKS.map(([key, fb]) => getImagePath("products", key, fb)),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(barServiceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(barBreadcrumbLd) }}
      />
      <BarHero heroSrc={heroSrc} />
      <MixologieIntro />
      <StickyCartes />
      <ShotsSection />
      <BottlesSection bottleSrcs={bottleSrcs} />
      <AlcoholFreeSection />
      <BarsSection />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(barFaqLd) }}
      />
      <FaqSection items={barFaq} />
      <IntentLinks />
      <CtaDevis />
    </>
  );
}
