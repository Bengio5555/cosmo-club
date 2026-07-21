import type { Metadata } from "next";
import { BaristaHero } from "@/components/barista/BaristaHero";
import { LattesGrid } from "@/components/barista/LattesGrid";
import { StandsSection } from "@/components/barista/StandsSection";
import { IdentitySection } from "@/components/barista/IdentitySection";
import { InstagrammableSection } from "@/components/barista/InstagrammableSection";
import { CtaDevis } from "@/components/home/CtaDevis";
import heroBaristaImg from "@/public/brand/ai/hero-barista.png";
import matchaImg from "@/public/brand/ai/latte-matcha.png";
import ubeImg from "@/public/brand/ai/latte-ube.png";
import blueImg from "@/public/brand/ai/latte-blue.png";
import goldenImg from "@/public/brand/ai/latte-golden.png";
import { getImagePath } from "@/lib/server/imagesConfig";
import { site } from "@/lib/site";
import {
  FaqSection,
  buildFaqLd,
  type FaqItem,
} from "@/components/site/FaqSection";

// FAQ — answers stick strictly to facts already published on the site
// (llms.txt, stands section, service pages). No invented figures.
const baristaFaq: FaqItem[] = [
  {
    q: "Comment se déroule une prestation barista événementiel ?",
    a: "L'équipe Cosmo Club gère l'intégralité de la logistique : livraison, installation du stand, service pendant l'événement et reprise du matériel. Vous n'avez rien à prévoir côté équipement — nous arrivons avec la machine, le stand, la vaisselle et les ingrédients.",
  },
  {
    q: "Quelles boissons servez-vous sur un stand barista ?",
    a: "Café de spécialité (espresso, latte, cappuccino, filtre) et nos quatre lattes signatures : Matcha, Ube, Blue et Golden. Chaque boisson peut être finie d'un latte art personnalisé au logo de votre entreprise ou au monogramme des mariés.",
  },
  {
    q: "Le stand s'adapte-t-il à la taille de mon lieu et de mon événement ?",
    a: "Oui. Trois formats de stand existent (1,8 m, 2,5 m et 3,5 m) et l'équipe compte de un à trois baristas selon le nombre d'invités et le rythme de service souhaité. Lors du devis, nous recommandons la configuration adaptée à votre effectif et à votre espace.",
  },
  {
    q: "Peut-on combiner un stand barista avec un bar à cocktails ?",
    a: "C'est même l'une de nos formules les plus demandées : bar à cocktails pour la soirée, corner barista pour l'accueil, le brunch du lendemain ou la fin de soirée. Les deux univers partagent la même direction artistique et la même équipe de coordination.",
  },
  {
    q: "Où intervenez-vous ?",
    a: "À Paris et dans toute l'Île-de-France, sur rendez-vous : mariages, événements d'entreprise, lancements de marque et soirées privées. Le service est disponible en français et en anglais.",
  },
  {
    q: "Sous quel délai puis-je obtenir un devis ?",
    a: "Vous recevez un devis personnalisé sous 24 à 48 heures après votre demande via le formulaire de contact, avec une proposition de configuration (taille de stand, nombre de baristas, carte de boissons) adaptée à votre événement.",
  },
];

const baristaFaqLd = buildFaqLd(`${site.url}/barista`, baristaFaq);

// Service + BreadcrumbList structured data. Every comparable landing
// page (mariage, entreprise, barman privé…) emits these via
// LandingPage.tsx — this hand-built page was the odd one out, leaving
// the barista offer invisible in the entity graph.
const baristaServiceLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${site.url}/barista#service`,
  name: "Barista événementiel — Cosmo Club Paris",
  description:
    "Service barista événementiel haut de gamme à Paris et en Île-de-France : matcha, ube, blue et golden lattes, café de spécialité, latte art personnalisé pour mariages, corporate et soirées privées.",
  serviceType: "Barista événementiel",
  provider: { "@id": `${site.url}/#organization` },
  areaServed: [
    { "@type": "City", name: "Paris" },
    { "@type": "AdministrativeArea", name: "Île-de-France" },
  ],
  url: `${site.url}/barista`,
  availableChannel: {
    "@type": "ServiceChannel",
    serviceUrl: `${site.url}/contact`,
    servicePhone: site.phone,
  },
};

const baristaBreadcrumbLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
    {
      "@type": "ListItem",
      position: 2,
      name: "Barista événementiel",
      item: `${site.url}/barista`,
    },
  ],
};

export const metadata: Metadata = {
  title: "Barista événementiel Paris — matcha & latte art",
  description:
    "Barista événementiel haut de gamme à Paris : matcha, ube, blue et golden lattes, café de spécialité et latte art personnalisé pour vos événements.",
  keywords: [
    "barista événementiel",
    "barista événementiel Paris",
    "barista mariage Paris",
    "service café événementiel",
    "matcha latte événementiel",
    "stand café événement",
    "latte art personnalisé",
  ],
  alternates: { canonical: "/barista" },
  openGraph: {
    title: "Barista événementiel — Cosmo Club Paris",
    description:
      "Lattes d'exception, café de spécialité et latte art personnalisé pour vos événements à Paris.",
    url: "/barista",
    type: "website",
  },
};

export default async function Page() {
  // All latte URLs resolved server-side so the admin-uploaded photos
  // ship in the SSR HTML — no swap from the static AI fallback after
  // hydration. Same pattern as the BaristaHero.
  const [heroSrc, matchaSrc, ubeSrc, blueSrc, goldenSrc] = await Promise.all([
    getImagePath("barista", "hero", heroBaristaImg.src),
    getImagePath("lattes", "latte-matcha", matchaImg.src),
    getImagePath("lattes", "latte-ube", ubeImg.src),
    getImagePath("lattes", "latte-blue", blueImg.src),
    getImagePath("lattes", "latte-golden", goldenImg.src),
  ]);
  const lattePaths = {
    matcha: matchaSrc,
    ube: ubeSrc,
    blue: blueSrc,
    golden: goldenSrc,
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(baristaServiceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(baristaBreadcrumbLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(baristaFaqLd) }}
      />
      <BaristaHero heroSrc={heroSrc} />
      <LattesGrid lattePaths={lattePaths} />
      <StandsSection />
      <IdentitySection />
      <InstagrammableSection />
      <FaqSection items={baristaFaq} />
      <CtaDevis />
    </>
  );
}
