import type { Metadata } from "next";
import { BarHero } from "@/components/bar/BarHero";
import { MixologieIntro } from "@/components/bar/MixologieIntro";
import { StickyCartes } from "@/components/bar/StickyCartes";
import { ShotsSection } from "@/components/bar/ShotsSection";
import { BottlesSection } from "@/components/bar/BottlesSection";
import { AlcoholFreeSection } from "@/components/bar/AlcoholFreeSection";
import { BarsSection } from "@/components/bar/BarsSection";
import { CtaDevis } from "@/components/home/CtaDevis";

export const metadata: Metadata = {
  title: "Bar à cocktails",
  description:
    "Mixologie événementielle — quatre cartes signatures (Classico, Cosmo, Émotion, Création), shots, cocktails en bouteille, juice bar et bars modulables. Cosmo Club Paris.",
};

export default function Page() {
  return (
    <>
      <BarHero />
      <MixologieIntro />
      <StickyCartes />
      <ShotsSection />
      <BottlesSection />
      <AlcoholFreeSection />
      <BarsSection />
      <CtaDevis />
    </>
  );
}
