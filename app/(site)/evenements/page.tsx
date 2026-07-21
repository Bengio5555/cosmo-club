import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventsGallery } from "@/components/home/EventsGallery";
import { ClientsMarquee } from "@/components/marquee/ClientsMarquee";
import { CtaDevis } from "@/components/home/CtaDevis";
import { getAllEventTiles } from "@/lib/server/homeGallery";
import { getPublicClientLogos } from "@/lib/server/clientLogos";

export const metadata: Metadata = {
  title: "Événements & références — mariages, corporate",
  description:
    "Portfolio Cosmo Club : mariages, événements corporate, défilés, lancements de marque et soirées privées à Paris, en bar à cocktails et barista.",
  keywords: [
    "événementiel cocktails Paris",
    "mariage cocktail Paris",
    "événementiel corporate Paris",
    "soirée privée Paris",
    "défilé cocktail bar",
    "lancement de marque cocktail",
  ],
  alternates: { canonical: "/evenements" },
  openGraph: {
    title: "Événements & références — Cosmo Club Paris",
    description: "Mariages, corporate, soirées privées : nos réalisations événementielles signature.",
    url: "/evenements",
    type: "website",
  },
};

export default async function Page() {
  // Full library here; the home shows only the curated 8 picked in
  // /dashboard/home-gallery.
  const [tiles, clientLogos] = await Promise.all([
    getAllEventTiles(),
    getPublicClientLogos(),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Références"
        title="Des soirées"
        italicWord="inoubliables."
        description={"Mariages, corporate, défilés, lancements de produit —\nune sélection de nos événements récents."}
      />
      <EventsGallery tiles={tiles} />
      <ClientsMarquee logos={clientLogos} />
      <CtaDevis />
    </>
  );
}
