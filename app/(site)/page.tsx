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

export default function HomePage() {
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
      <LiquidHero />
      <CocktailMarquee />
      <BaristaMarquee />
      <UniversBento />
      <ConceptManifesto />
      <Personnalisation />
      <EventsGallery />
      <ClientsMarquee />
      <CtaDevis />
    </>
  );
}
