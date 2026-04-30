import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventsGallery } from "@/components/home/EventsGallery";
import { ClientsMarquee } from "@/components/marquee/ClientsMarquee";
import { CtaDevis } from "@/components/home/CtaDevis";
import { getAllEventTiles } from "@/lib/server/homeGallery";
import { getPublicClientLogos } from "@/lib/server/clientLogos";

export const metadata: Metadata = {
  title: "Événements & références",
  description: "Mariages, corporate, défilés, soirées privées — les événements signés Cosmo Club.",
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
        description="Mariages, corporate, défilés, lancements de produit — une sélection de nos événements récents."
      />
      <EventsGallery tiles={tiles} />
      <ClientsMarquee logos={clientLogos} />
      <CtaDevis />
    </>
  );
}
