import { LiquidHero } from "@/components/hero/LiquidHero";
import { CocktailMarquee } from "@/components/marquee/CocktailMarquee";
import { BaristaMarquee } from "@/components/marquee/BaristaMarquee";
import { UniversBento } from "@/components/bento/UniversBento";
import { ConceptManifesto } from "@/components/home/ConceptManifesto";
import { Personnalisation } from "@/components/home/Personnalisation";
import { EventsGallery } from "@/components/home/EventsGallery";
import { ClientsMarquee } from "@/components/marquee/ClientsMarquee";
import { Testimonials } from "@/components/home/Testimonials";
import { CtaDevis } from "@/components/home/CtaDevis";
import { site } from "@/lib/site";
import { testimonials, reviewsAggregate } from "@/lib/testimonials";
import heroHomeImg from "@/public/brand/ai/hero-home.png";
import { getImagePath } from "@/lib/server/imagesConfig";
import { getPublicClientLogos } from "@/lib/server/clientLogos";
import { getHomeGalleryTiles } from "@/lib/server/homeGallery";

const PERSONNALISATION_FALLBACKS: Record<string, string> = {
  glacons: "/brand/ai/glaçons.png",
  pastilles: "/brand/ai/pastilles.png",
  "toppings-fruit": "/brand/ai/pastilles.png",
  pochoirs: "/brand/ai/glaçons.png",
  melangeurs: "/brand/ai/pastilles.png",
  "dessous-de-verre": "/brand/ai/glaçons.png",
};

export default async function HomePage() {
  // Resolve every dynamic image URL server-side so the admin-uploaded
  // versions are in the SSR HTML from the start — no flash of the
  // static fallback while a client hook fetches the config.
  const [
    heroSrc,
    clientLogos,
    galleryTiles,
    persoEntries,
    bentoBarSrc,
    bentoBaristaSrc,
  ] = await Promise.all([
    getImagePath("home", "hero", heroHomeImg.src),
    getPublicClientLogos(),
    getHomeGalleryTiles(),
    Promise.all(
      Object.entries(PERSONNALISATION_FALLBACKS).map(async ([key, fallback]) => {
        const path = await getImagePath("personnalisation", key, fallback);
        return [key, path] as const;
      }),
    ),
    getImagePath("bar-a-cocktails", "bento", "/brand/ai/bento-bar-cocktails.png"),
    getImagePath("barista", "bento", "/brand/ai/bento-barista.png"),
  ]);
  const persoPaths = Object.fromEntries(persoEntries);
  const bentoPaths = { bar: bentoBarSrc, barista: bentoBaristaSrc };

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
    // Real, verifiable Google rating (5.0 over 15 reviews) — mirrored
    // from lib/testimonials.ts and displayed verbatim in the on-page
    // <Testimonials> section, which Google requires for review markup.
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: reviewsAggregate.ratingValue.toFixed(1),
      reviewCount: reviewsAggregate.reviewCount,
      bestRating: reviewsAggregate.bestRating,
      worstRating: 1,
    },
    review: testimonials.map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.author },
      reviewRating: {
        "@type": "Rating",
        ratingValue: t.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: t.body,
      ...(t.date ? { datePublished: t.date } : {}),
    })),
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
      <UniversBento paths={bentoPaths} />
      <ConceptManifesto />
      <ClientsMarquee logos={clientLogos} />
      <Personnalisation paths={persoPaths} />
      <EventsGallery tiles={galleryTiles} showSeeMore />
      <Testimonials />
      <CtaDevis />
    </>
  );
}
