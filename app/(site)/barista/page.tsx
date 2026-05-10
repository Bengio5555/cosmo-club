import type { Metadata } from "next";
import { BaristaHero } from "@/components/barista/BaristaHero";
import { LattesGrid } from "@/components/barista/LattesGrid";
import { StandsSection } from "@/components/barista/StandsSection";
import { IdentitySection } from "@/components/barista/IdentitySection";
import { InstagrammableSection } from "@/components/barista/InstagrammableSection";
import { CtaDevis } from "@/components/home/CtaDevis";
import heroBaristaImg from "@/public/brand/ai/hero-barista.png";
import { getImagePath } from "@/lib/server/imagesConfig";

export const metadata: Metadata = {
  title: "Barista",
  description:
    "Matcha, Ube, Blue, Golden Latte — lattes d'exception servis chauds ou glacés, stands barista sur-mesure et latte art personnalisé. Cosmo Club Paris.",
};

export default async function Page() {
  const heroSrc = await getImagePath("barista", "hero", heroBaristaImg.src);
  return (
    <>
      <BaristaHero heroSrc={heroSrc} />
      <LattesGrid />
      <StandsSection />
      <IdentitySection />
      <InstagrammableSection />
      <CtaDevis />
    </>
  );
}
