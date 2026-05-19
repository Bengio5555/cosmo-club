import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";

const SLUG = "/bar-a-cocktails/mariage";

export const metadata: Metadata = {
  title: "Bar à cocktails mariage Paris — Mixologie événementielle",
  description:
    "Bar à cocktails événementiel pour votre mariage à Paris et en Île-de-France. Mixologue, scénographie, cartes signature, mocktails et personnalisation. Devis sous 24 h.",
  keywords: [
    "bar à cocktails mariage Paris",
    "bar cocktail mariage",
    "barman mariage Paris",
    "mixologie mariage",
    "cocktails mariage Paris",
    "animation mariage cocktails",
    "bar mobile mariage",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Bar à cocktails mariage Paris — Cosmo Club",
    description:
      "Mixologie événementielle pour votre mariage. Bars modulables, cartes signature, mocktails élégants, scénographie sur mesure.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Bar à cocktails mariage",
  h1: "Le bar à cocktails de votre mariage.",
  h1Accent: "cocktails",
  subtitle:
    "Mixologie événementielle haut de gamme pour votre mariage à Paris et en Île-de-France. Cartes signature, bar scénographié, mocktails pour tous.",
  heroSrc: "/brand/ai/hero-bar-cocktails.png",
  intro: [
    "Le bar à cocktails marque la bascule. Quand les invités passent du cocktail debout à la piste de danse, le bar devient le cœur visuel et social de la soirée — celui qu'on photographie, qu'on partage, qu'on revit en story.",
    "Nous concevons ce moment avec vous. Cartes pensées comme une signature, scénographie modulée selon votre lieu, mixologues formés à recevoir, mocktails à la hauteur de tous les invités. Une prestation qui se voit, se goûte, et reste en mémoire bien après les noces.",
  ],
  pillars: [
    {
      title: "Une carte qui raconte votre histoire",
      body: "Cocktails signature, mocktails élégants, twists sur les classiques. Nous co-écrivons la carte avec vous pour qu'elle reflète votre couple — un nom, un parfum, un souvenir — et qu'elle s'inscrive dans le récit de la journée.",
    },
    {
      title: "Un bar pensé comme du décor",
      body: "Bar miroir, bois, acier brossé, format 2 à 6 baies. Nous adaptons le mobilier à votre lieu — château, loft parisien, jardin, salle de réception — et l'habillons aux couleurs du mariage : sticker, néon, pochoir, fleurs, glaçons brandés.",
    },
    {
      title: "Un service à hauteur du moment",
      body: "Mixologues sélectionnés pour leur posture, leur précision, leur élégance. Tenue impeccable, gestes précis, mots justes. Le service est invisible quand tout se passe bien — c'est ça notre standard.",
    },
    {
      title: "Une logistique réglée au cordeau",
      body: "Repérage du lieu en amont, planning détaillé, livraison-installation-reprise gérées par nos équipes. Vous n'avez à penser à rien le jour J — c'est tout l'intérêt d'une prestation tournée vers vous.",
    },
  ],
  experience: {
    title: "Ce que vous obtenez avec Cosmo Club.",
    paragraphs: [
      "Une prestation mariage premium, conçue pour s'inscrire dans le récit de votre journée et non comme une simple ligne logistique. Nous commençons toujours par une conversation : votre lieu, votre nombre d'invités, l'ambiance que vous projetez, les détails que vous chérissez. C'est de cette discussion que naît la proposition — pas l'inverse.",
      "Côté carte, nous proposons quatre univers déclinables : cocktails Classico (les grands classiques revisités), Cocktails Cosmo (notre signature), Émotion (créations sur-mesure liées à votre histoire) et Mocktails. Chaque carte se construit à votre image : ingrédients, garnitures, contenants, names. Nous évitons les marques tierces tape-à-l'œil sauf si elles font sens dans votre récit.",
      "Côté scénographie, nos bars miroirs (de 1m60 à 3m), nos bars bois et nos stations barista s'ajustent à votre espace. Personnalisation comprise : sticker pleine façade, pochoirs, glaçons brandés, fleurs comestibles, pastilles personnalisées. La carte des cocktails imprimée est offerte.",
      "Côté équipe, vous bénéficiez d'un binôme barman + commis a minima, formés à recevoir des invités exigeants dans un cadre solennel. Pour les soirées au-delà de 100 invités, nous étoffons l'équipe et déployons plusieurs baies pour qu'aucune attente ne ralentisse le rythme.",
    ],
  },
  timeline: [
    {
      label: "Échange initial",
      body: "Premier appel ou visio pour comprendre votre couple, le lieu, le nombre d'invités, l'ambiance que vous imaginez.",
    },
    {
      label: "Proposition sur mesure",
      body: "Plaquette dédiée envoyée sous 24 à 48 h : cartes pré-pensées, bars suggérés, personnalisations, planning, chiffrage transparent.",
    },
    {
      label: "Repérage & ajustements",
      body: "Visite du lieu en amont, validation du déploiement avec votre wedding planner ou directement avec vous. Carte finalisée à J-15.",
    },
    {
      label: "Le jour J",
      body: "Livraison, installation, prestation, reprise — tout est géré par notre équipe. Vous profitez sans logistique.",
    },
  ],
  faq: [
    {
      q: "Quand faut-il réserver un bar à cocktails pour un mariage ?",
      a: "Le plus tôt est le mieux, surtout en haute saison (mai à septembre). Cela dit, nous avons l'habitude de travailler dans des délais resserrés : si votre date est proche, contactez-nous quand même — nous voyons systématiquement ce qui est possible.",
    },
    {
      q: "Faites-vous des cocktails sans alcool pour les invités qui ne boivent pas ?",
      a: "Oui, c'est même un standard pour nous. Notre carte Mocktails est construite avec la même exigence que la carte alcoolisée : ingrédients premium, présentation soignée, vraie identité de goût. Vos invités sans alcool ne ressentent jamais l'effet « lot de consolation ».",
    },
    {
      q: "Pouvez-vous créer un cocktail signature à notre nom ?",
      a: "Oui, c'est un classique de nos prestations mariage. Nous concevons un ou deux cocktails dédiés à votre couple — un nom, un ingrédient totem, une histoire courte imprimée sur la carte. Souvent, c'est ce détail qui marque les invités.",
    },
    {
      q: "Intervenez-vous dans toute l'Île-de-France ?",
      a: "Oui, nous nous déplaçons dans toute l'Île-de-France. Pour les destinations hors région ou à la campagne, nous étudions au cas par cas en fonction de la logistique de votre lieu (accessibilité camion, point d'eau, électricité).",
    },
    {
      q: "Personnalisez-vous le bar aux couleurs du mariage ?",
      a: "Oui : sticker bar pleine façade, glaçons brandés, pastilles comestibles, pochoirs, néon sur mesure, fleurs comestibles. La composition florale et l'impression des cartes sont offertes. Le reste est sur devis selon ce que vous imaginez.",
    },
    {
      q: "Avez-vous une assurance et toutes les autorisations nécessaires ?",
      a: "Oui : RC professionnelle, licence III pour le débit de boissons, déclaration ouverte au préfet de Paris. Tous nos mixologues sont déclarés et formés. Nous fournissons les attestations à votre lieu de réception sur simple demande.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/anniversaire",
      label: "Bar à cocktails anniversaire",
      desc: "30, 40, 50 ans — un anniversaire qui marque, sans la pression d'un mariage.",
    },
    {
      href: "/bar-a-cocktails/entreprise",
      label: "Bar à cocktails entreprise",
      desc: "Cocktails de fin d'année, lancements, séminaires : la formule corporate.",
    },
    {
      href: "/evenements",
      label: "Nos réalisations",
      desc: "Portfolio des mariages et événements signés Cosmo Club Paris.",
    },
  ],
  serviceJsonLd: {
    name: "Bar à cocktails mariage — Cosmo Club Paris",
    description:
      "Bar à cocktails événementiel premium pour mariages à Paris et en Île-de-France. Cartes signature, scénographie sur mesure, mocktails, équipe de mixologues formée à l'événementiel haut de gamme.",
    serviceType: "Bar à cocktails mariage",
  },
};

export default function MariagePage() {
  return <LandingPage config={config} />;
}
