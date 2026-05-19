import type { Metadata } from "next";
import { BaristaHero } from "@/components/barista/BaristaHero";
import { LattesGrid } from "@/components/barista/LattesGrid";
import { StandsSection } from "@/components/barista/StandsSection";
import { IdentitySection } from "@/components/barista/IdentitySection";
import { InstagrammableSection } from "@/components/barista/InstagrammableSection";
import { CtaDevis } from "@/components/home/CtaDevis";
import heroBaristaImg from "@/public/brand/ai/hero-barista.png";
import matchaImg from "@/public/brand/ai/latte-matcha.png";
import ubeImg from "@/public/brand/ai/latte-ube.png";
import blueImg from "@/public/brand/ai/latte-blue.png";
import goldenImg from "@/public/brand/ai/latte-golden.png";
import { getImagePath } from "@/lib/server/imagesConfig";

export const metadata: Metadata = {
  title: "Barista événementiel Paris — Matcha, Ube, Latte Art sur mesure",
  description:
    "Service barista événementiel haut de gamme à Paris et en Île-de-France. Matcha, Ube, Blue & Golden Lattes, café de spécialité, latte art personnalisé, stands sur-mesure pour mariages, corporate et soirées privées.",
  keywords: [
    "barista événementiel",
    "barista événementiel Paris",
    "barista mariage Paris",
    "service café événementiel",
    "matcha latte événementiel",
    "stand café événement",
    "latte art personnalisé",
  ],
  alternates: { canonical: "/barista" },
  openGraph: {
    title: "Barista événementiel — Cosmo Club Paris",
    description:
      "Lattes d'exception, café de spécialité et latte art personnalisé pour vos événements à Paris.",
    url: "/barista",
    type: "website",
  },
};

export default async function Page() {
  // All latte URLs resolved server-side so the admin-uploaded photos
  // ship in the SSR HTML — no swap from the static AI fallback after
  // hydration. Same pattern as the BaristaHero.
  const [heroSrc, matchaSrc, ubeSrc, blueSrc, goldenSrc] = await Promise.all([
    getImagePath("barista", "hero", heroBaristaImg.src),
    getImagePath("lattes", "latte-matcha", matchaImg.src),
    getImagePath("lattes", "latte-ube", ubeImg.src),
    getImagePath("lattes", "latte-blue", blueImg.src),
    getImagePath("lattes", "latte-golden", goldenImg.src),
  ]);
  const lattePaths = {
    matcha: matchaSrc,
    ube: ubeSrc,
    blue: blueSrc,
    golden: goldenSrc,
  };
  return (
    <>
      <BaristaHero heroSrc={heroSrc} />
      <LattesGrid lattePaths={lattePaths} />
      <StandsSection />
      <IdentitySection />
      <InstagrammableSection />
      <CtaDevis />
    </>
  );
}
