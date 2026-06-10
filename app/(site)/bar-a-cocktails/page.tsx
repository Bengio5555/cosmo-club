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
      <IntentLinks />
      <CtaDevis />
    </>
  );
}
