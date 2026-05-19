import type { Metadata } from "next";
import { BarHero } from "@/components/bar/BarHero";
import { MixologieIntro } from "@/components/bar/MixologieIntro";
import { StickyCartes } from "@/components/bar/StickyCartes";
import { ShotsSection } from "@/components/bar/ShotsSection";
import { BottlesSection } from "@/components/bar/BottlesSection";
import { AlcoholFreeSection } from "@/components/bar/AlcoholFreeSection";
import { BarsSection } from "@/components/bar/BarsSection";
import { IntentLinks } from "@/components/landing/IntentLinks";
import { CtaDevis } from "@/components/home/CtaDevis";
import heroBarImg from "@/public/brand/ai/hero-bar.png";
import { getImagePath } from "@/lib/server/imagesConfig";

export const metadata: Metadata = {
  title: "Bar à cocktails événementiel Paris — Mariage, Corporate, Privé",
  description:
    "Bar à cocktails mobile premium à Paris et en Île-de-France. Mixologie événementielle pour mariages, soirées d'entreprise et événements privés : quatre cartes signatures, shots, cocktails en bouteille, juice bar, bars modulables.",
  keywords: [
    "bar à cocktails événementiel",
    "bar à cocktails mariage Paris",
    "bar à cocktails entreprise Paris",
    "mixologie événementielle",
    "barman événementiel Paris",
    "bar mobile Paris",
    "cocktails sur mesure",
  ],
  alternates: { canonical: "/bar-a-cocktails" },
  openGraph: {
    title: "Bar à cocktails événementiel — Cosmo Club Paris",
    description:
      "Bar à cocktails mobile premium pour vos événements à Paris et en Île-de-France.",
    url: "/bar-a-cocktails",
    type: "website",
  },
};

const BOTTLE_FALLBACKS: Array<[string, string]> = [
  ["bottle-20cl", "/brand/ai/bottle-20cl.png"],
  ["bottle-50cl", "/brand/ai/bottle-50cl.png"],
  ["bottle-1L", "/brand/ai/bottle-1L.png"],
];

export default async function Page() {
  // Resolve every image URL server-side so the SSR HTML already points
  // at the admin-uploaded versions — kills the static→admin flash.
  const [heroSrc, ...bottleSrcs] = await Promise.all([
    getImagePath("bar-a-cocktails", "hero", heroBarImg.src),
    ...BOTTLE_FALLBACKS.map(([key, fb]) => getImagePath("products", key, fb)),
  ]);
  return (
    <>
      <BarHero heroSrc={heroSrc} />
      <MixologieIntro />
      <StickyCartes />
      <ShotsSection />
      <BottlesSection bottleSrcs={bottleSrcs} />
      <AlcoholFreeSection />
      <BarsSection />
      <IntentLinks />
      <CtaDevis />
    </>
  );
}
