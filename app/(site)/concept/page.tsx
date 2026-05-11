import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConceptManifesto } from "@/components/home/ConceptManifesto";
import { CtaDevis } from "@/components/home/CtaDevis";

export const metadata: Metadata = {
  title: "Le concept — Cosmo Club, mixologie événementielle Paris",
  description:
    "L'histoire, l'équipe et la philosophie de Cosmo Club Paris : un laboratoire de mixologie et de barista événementiel, signature parisienne pour vos mariages, corporate et soirées privées.",
  alternates: { canonical: "/concept" },
  openGraph: {
    title: "Le concept — Cosmo Club Paris",
    description: "Un laboratoire de mixologie et de barista événementiel, signature parisienne.",
    url: "/concept",
    type: "website",
  },
};

export default function Page() {
  return (
    <>
      <PageHeader
        eyebrow="Notre univers"
        title="Un laboratoire"
        italicWord="de nuits."
        description="Derrière chaque verre, une équipe — mixologistes, baristas, directeurs artistiques. Chez Cosmo Club, l'événement se compose comme une partition."
      />
      <ConceptManifesto />
      <CtaDevis />
    </>
  );
}
