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
    "@type": "LocalBusiness",
    name: site.name,
    image: `${site.url}/og.jpg`,
    url: site.url,
    telephone: site.phone,
    email: site.email,
    priceRange: "€€€",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Paris",
      postalCode: "75008",
      addressCountry: "FR",
    },
    sameAs: [site.instagram],
    description: site.description,
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
