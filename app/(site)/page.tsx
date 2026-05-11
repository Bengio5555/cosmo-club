import { LiquidHero } from "@/components/hero/LiquidHero";
import { CocktailMarquee } from "@/components/marquee/CocktailMarquee";
import { BaristaMarquee } from "@/components/marquee/BaristaMarquee";
import { UniversBento } from "@/components/bento/UniversBento";
import { ConceptManifesto } from "@/components/home/ConceptManifesto";
import { Personnalisation } from "@/components/home/Personnalisation";
import { EventsGallery } from "@/components/home/EventsGallery";
import { ClientsMarquee } from "@/components/marquee/ClientsMarquee";
import { CtaDevis } from "@/components/home/CtaDevis";
import { site } from "@/lib/site";
import heroHomeImg from "@/public/brand/ai/hero-home.png";
import { getImagePath } from "@/lib/server/imagesConfig";
import { getPublicClientLogos } from "@/lib/server/clientLogos";
import { getHomeGalleryTiles } from "@/lib/server/homeGallery";

export default async function HomePage() {
  // Resolve the hero URL server-side so the admin-uploaded image (if
  // any) is in the SSR HTML — no flash from the static fallback.
  const [heroSrc, clientLogos, galleryTiles] = await Promise.all([
    getImagePath("home", "hero", heroHomeImg.src),
    getPublicClientLogos(),
    getHomeGalleryTiles(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["ProfessionalService", "FoodService"],
    "@id": `${site.url}/#business`,
    name: site.name,
    alternateName: site.shortName,
    url: site.url,
    image: `${site.url}/og.jpg`,
    logo: `${site.url}/brand/cosmo-logo.png`,
    description: site.description,
    telephone: site.phone.replace(/\s/g, ""),
    email: site.email,
    priceRange: "€€€",
    currenciesAccepted: "EUR",
    paymentAccepted: ["Cash", "Credit Card", "Bank Transfer"],
    areaServed: [
      { "@type": "City", name: "Paris" },
      { "@type": "AdministrativeArea", name: "Île-de-France" },
    ],
    serviceType: [
      "Bar à cocktails événementiel",
      "Barista événementiel",
      "Mixologie événementielle",
      "Service cocktails mariage",
      "Service cocktails entreprise",
    ],
    knowsAbout: [
      "Cocktails",
      "Mixologie",
      "Barista",
      "Café de spécialité",
      "Événementiel premium",
      "Mariage",
      "Soirée d'entreprise",
    ],
    availableLanguage: ["fr", "en"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Prestations Cosmo Club",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Bar à cocktails événementiel",
            url: `${site.url}/bar-a-cocktails`,
            description:
              "Bar mobile premium pour mariages, soirées d'entreprise et événements privés à Paris et en Île-de-France.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Service barista événementiel",
            url: `${site.url}/barista`,
            description:
              "Service barista café de spécialité pour vos événements professionnels et privés à Paris.",
          },
        },
      ],
    },
    sameAs: [site.instagram],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.phone.replace(/\s/g, ""),
      email: site.email,
      contactType: "Devis et réservations",
      areaServed: "FR",
      availableLanguage: ["fr", "en"],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LiquidHero heroSrc={heroSrc} />
      <CocktailMarquee />
      <BaristaMarquee />
      <UniversBento />
      <ConceptManifesto />
      <ClientsMarquee logos={clientLogos} />
      <Personnalisation />
      <EventsGallery tiles={galleryTiles} showSeeMore />
      <CtaDevis />
    </>
  );
}
