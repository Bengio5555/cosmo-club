import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";

const SLUG = "/bar-a-cocktails/entreprise";

export const metadata: Metadata = {
  title: "Bar à cocktails entreprise Paris — Soirée corporate, séminaire",
  description:
    "Bar à cocktails événementiel pour entreprises à Paris et en Île-de-France. Lancements, soirées corporate, séminaires, cocktails de fin d'année. Carte sur mesure, scénographie de marque, devis sous 24 h.",
  keywords: [
    "bar à cocktails entreprise Paris",
    "bar à cocktails corporate",
    "cocktail entreprise Paris",
    "soirée entreprise cocktails",
    "lancement de marque cocktail",
    "séminaire cocktail Paris",
    "bar événementiel B2B",
    "cocktail fin d'année entreprise",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Bar à cocktails entreprise — Cosmo Club Paris",
    description:
      "Mixologie événementielle B2B : lancements de marque, soirées corporate, séminaires, cocktails de fin d'année.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Bar à cocktails entreprise",
  h1: "Cocktails pour vos événements d'entreprise.",
  h1Accent: "Cocktails",
  subtitle:
    "Lancement de marque, soirée corporate, séminaire, cocktail de fin d'année. Mixologie événementielle premium à Paris et en Île-de-France, brandée à vos couleurs.",
  heroSrc: "/brand/ai/hero-bar.png",
  intro: [
    "Un événement d'entreprise réussi laisse une trace. Pas un buffet anonyme et trois bouteilles sur une nappe : un bar visuel, une carte travaillée, un service qui valorise vos invités et porte votre marque.",
    "Cosmo Club intervient pour les lancements produit, soirées corporate, conventions, séminaires et cocktails de fin d'année dans Paris et en Île-de-France. Nous travaillons aussi bien avec les directions communication, marketing, RH, qu'avec les agences événementielles partenaires.",
  ],
  pillars: [
    {
      title: "Une scénographie au service de votre marque",
      body: "Sticker pleine façade, pochoirs sur la mousse, glaçons brandés à votre logo, pastilles comestibles, néons sur mesure. Le bar devient une extension de votre identité visuelle, pas un décor générique.",
    },
    {
      title: "Des cocktails qui racontent votre histoire",
      body: "Carte construite avec vous : ingrédients liés à votre univers, naming aligné sur votre marque ou votre produit, mocktails pour les clients sobres. Un cocktail signature à votre nom, c'est souvent ce que vos invités retiennent.",
    },
    {
      title: "Un service à la hauteur de votre niveau d'exigence",
      body: "Mixologues sélectionnés pour leur posture, leur précision et leur élégance. Tenue impeccable, débit calibré pour ne jamais faire attendre, mots justes face à vos clients VIP ou vos collaborateurs.",
    },
    {
      title: "Une facturation B2B claire",
      body: "Devis détaillé, facture entreprise, TVA, paiement par virement. Nous travaillons avec votre service achats ou votre wedding planner / agence sans friction. Apporteur d'affaires accepté.",
    },
  ],
  experience: {
    title: "Ce qu'on déploie pour vos événements.",
    paragraphs: [
      "Pour un lancement produit, nous concevons souvent une carte courte mais signature, alignée sur l'univers du produit lancé. Le bar miroir branded prend la photo principale du press release. Pour un cocktail de fin d'année, on travaille un format plus festif, plusieurs cartes pour varier les goûts, des mocktails élégants pour les collaborateurs qui ne boivent pas.",
      "Pour un séminaire ou une convention, nous installons le bar en fin de journée et offrons aux participants un moment de décompression encadré : carte allégée, débit calibré pour le nombre d'invités, présence visuelle forte sans empiéter sur le contenu de l'événement.",
      "Côté logistique, nous gérons livraison-installation-reprise en jour ou nuit, dans Paris et en Île-de-France. Les forfaits sont distincts entre Paris intra-muros et hors Paris pour rester transparents. Nous travaillons en direct avec votre lieu (Pavillon Royal, Hôtel particulier, salle privatisée, rooftop, locaux d'entreprise) et fournissons toutes les attestations légales nécessaires (RC pro, licence III, déclaration préfecture).",
      "Côté équipe, le format de base est barman + commis. À partir de 100 invités, nous étoffons. Pour les événements à fort enjeu image (lancement presse, soirée VIP), nous proposons un flair bartender ou un barista en complément pour accentuer le côté spectaculaire.",
    ],
  },
  timeline: [
    {
      label: "Brief événement",
      body: "Visio ou rendez-vous pour comprendre l'objectif (lancement, fidélisation, fin d'année, séminaire), le public, la marque, le lieu.",
    },
    {
      label: "Proposition créative + chiffrage",
      body: "Plaquette dédiée envoyée sous 48 h : cartes proposées, scénographie suggérée, options de personnalisation, planning, chiffrage transparent.",
    },
    {
      label: "Validation contractuelle",
      body: "Devis signé, acompte par virement, débrief avec votre équipe ou votre agence pour caler les détails (timing, accès, branding).",
    },
    {
      label: "Le jour J",
      body: "Livraison, installation discrète, prestation, reprise. Brief équipe en interne avant l'arrivée des invités.",
    },
  ],
  faq: [
    {
      q: "Travaillez-vous avec des agences événementielles ?",
      a: "Oui, c'est même une part importante de notre activité. Nous collaborons régulièrement avec des agences wedding planners, B2B, communication. Un système d'apporteur d'affaires existe et est cadré contractuellement. Contactez-nous pour les modalités.",
    },
    {
      q: "Pouvez-vous brander entièrement le bar à nos couleurs ?",
      a: "Oui : sticker pleine façade (1m20 ou plus), pochoirs sur la mousse des cocktails, glaçons brandés à votre logo, pastilles comestibles, néon sur mesure, signalétique. Compositions florales et impression menus sont incluses. Le reste est sur devis selon votre direction artistique.",
    },
    {
      q: "Pouvez-vous créer un cocktail signature pour notre marque ?",
      a: "Oui, c'est très demandé. Nous concevons un ou plusieurs cocktails dédiés à votre marque ou à votre produit : naming, ingrédients liés à votre univers, présentation visuelle alignée. Souvent, c'est le visuel qui circule le plus en post-event sur les réseaux.",
    },
    {
      q: "Quelles sont vos zones d'intervention ?",
      a: "Paris intra-muros et Île-de-France, avec un forfait de livraison distinct selon la zone. Pour les destinations hors région ou les événements à l'étranger, contactez-nous : nous étudions au cas par cas selon la logistique.",
    },
    {
      q: "Quelles factures et attestations fournissez-vous ?",
      a: "Devis et facture TTC en bonne et due forme, RC pro, licence III pour le débit de boissons, déclaration ouverte à la préfecture de Paris. Tous les documents sont fournis à votre service achats ou à votre lieu de réception sur simple demande.",
    },
    {
      q: "Faites-vous les cocktails de fin d'année pour des équipes de 200+ personnes ?",
      a: "Oui, nous adaptons l'équipe et le déploiement (plusieurs baies, cartes optimisées pour le débit, équipe étoffée). Pour les gros formats, nous validons en amont la logistique avec votre lieu de réception et calibrons précisément le tempo de service.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/mariage",
      label: "Bar à cocktails mariage",
      desc: "La prestation mariage : carte signature, scénographie, accompagnement complet.",
    },
    {
      href: "/bar-a-cocktails/anniversaire",
      label: "Bar à cocktails anniversaire",
      desc: "30, 40, 50 ans — un anniversaire qui marque, sans la pression d'un mariage.",
    },
    {
      href: "/barista",
      label: "Service barista",
      desc: "Café de spécialité pour vos séminaires et événements professionnels.",
    },
  ],
  serviceJsonLd: {
    name: "Bar à cocktails entreprise — Cosmo Club Paris",
    description:
      "Bar à cocktails événementiel B2B à Paris et en Île-de-France : lancements de marque, soirées corporate, séminaires, cocktails de fin d'année. Scénographie brandée, cartes sur mesure, facturation entreprise.",
    serviceType: "Bar à cocktails entreprise",
  },
};

export default function EntreprisePage() {
  return <LandingPage config={config} />;
}
