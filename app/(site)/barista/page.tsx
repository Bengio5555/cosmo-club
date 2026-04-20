import type { Metadata } from "next";
import { BaristaHero } from "@/components/barista/BaristaHero";
import { LattesGrid } from "@/components/barista/LattesGrid";
import { StandsSection } from "@/components/barista/StandsSection";
import { IdentitySection } from "@/components/barista/IdentitySection";
import { InstagrammableSection } from "@/components/barista/InstagrammableSection";
import { CtaDevis } from "@/components/home/CtaDevis";

export const metadata: Metadata = {
  title: "Barista",
  description:
    "Matcha, Ube, Blue, Golden Latte — lattes d'exception servis chauds ou glacés, stands barista sur-mesure et latte art personnalisé. Cosmo Club Paris.",
};

export default function Page() {
  return (
    <>
      <BaristaHero />
      <LattesGrid />
      <StandsSection />
      <IdentitySection />
      <InstagrammableSection />
      <CtaDevis />
    </>
  );
}
