import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventsGallery } from "@/components/home/EventsGallery";
import { ClientsMarquee } from "@/components/marquee/ClientsMarquee";
import { CtaDevis } from "@/components/home/CtaDevis";

export const metadata: Metadata = {
  title: "Événements & références",
  description: "Mariages, corporate, défilés, soirées privées — les événements signés Cosmo Club.",
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Références"
        title="Des soirées"
        italicWord="inoubliables."
        description="Mariages, corporate, défilés, lancements de produit — une sélection de nos événements récents."
      />
      <EventsGallery />
      <ClientsMarquee />
      <CtaDevis />
    </>
  );
}
