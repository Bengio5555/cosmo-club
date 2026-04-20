import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConceptManifesto } from "@/components/home/ConceptManifesto";
import { CtaDevis } from "@/components/home/CtaDevis";

export const metadata: Metadata = {
  title: "Le concept",
  description: "L'histoire, l'équipe et la philosophie Cosmo Club.",
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
