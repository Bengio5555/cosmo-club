import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";

const SLUG = "/animation-cocktail-paris";
const FALLBACK_HERO = "/brand/ai/bento-bar-cocktails.png";

export const metadata: Metadata = {
  title: "Animation cocktail Paris — Atelier mixologie et masterclass",
  description:
    "Animation cocktail et atelier mixologie à Paris : masterclass à domicile, en entreprise, team building, EVJF/EVG. Apprenez à composer vos cocktails avec un mixologue professionnel. Devis sous 24 h.",
  keywords: [
    "animation cocktail Paris",
    "atelier cocktail Paris",
    "masterclass mixologie",
    "atelier mixologie Paris",
    "team building cocktail",
    "EVJF cocktail Paris",
    "EVG cocktail Paris",
    "cours cocktail Paris",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Animation cocktail Paris — Cosmo Club",
    description:
      "Atelier mixologie et masterclass cocktails à Paris : à domicile, en entreprise, EVJF/EVG, team building.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Animation cocktail",
  h1: "Atelier mixologie et animation cocktail à Paris.",
  h1Accent: "mixologie",
  subtitle:
    "Apprenez à composer vos cocktails avec un mixologue professionnel. À domicile, en entreprise, pour un EVJF, un EVG ou un team building.",
  heroSrc: FALLBACK_HERO,
  intro: [
    "Un atelier cocktail réussi, c'est plus qu'une démonstration : c'est un moment partagé, technique, fun, qui transforme vos invités en mixologues d'un soir. Chaque participant repart avec des recettes qu'il saura refaire.",
    "Cosmo Club anime des ateliers mixologie à Paris et en Île-de-France : à domicile pour un anniversaire, un EVJF, un EVG, en entreprise pour un team building, ou dans nos lieux partenaires. Tout est calibré selon votre profil de groupe et votre niveau.",
  ],
  pillars: [
    {
      title: "Un format pédagogique sans être scolaire",
      body: "Nos mixologues expliquent, démontrent, font goûter. Vous reproduisez avec eux, à votre rythme. Pas de théorie inutile : on apprend en faisant, et on boit ce qu'on fabrique.",
    },
    {
      title: "Adapté à votre groupe",
      body: "Atelier intime (6 à 8 personnes) pour les formats domestiques, atelier moyen (8 à 12) pour les anniversaires, masterclass étendue (15+) pour les team buildings. Carte cocktails adaptée au niveau et aux préférences du groupe.",
    },
    {
      title: "Équipement professionnel fourni",
      body: "Shakers, verrerie, mesures, ingrédients, glace : tout est apporté et installé. Vous n'avez rien à acheter, rien à préparer. Chaque participant a son poste de mixologie.",
    },
    {
      title: "Trois cocktails par participant",
      body: "Chaque atelier comprend la création (et la dégustation) de trois cocktails minimum. Nous laissons souvent une carte récap avec les recettes pour que vos invités puissent rejouer à la maison.",
    },
  ],
  experience: {
    title: "Comment se déroule un atelier Cosmo Club.",
    paragraphs: [
      "L'atelier commence par une introduction courte (15-20 min) : grandes familles de cocktails, techniques fondamentales (build, shake, stir), ingrédients clés. Notre mixologue démontre devant le groupe, puis chaque participant reproduit à son poste avec son propre matériel.",
      "Nous travaillons généralement trois cocktails : un classique (mojito, margarita, old fashioned ou cosmopolitan revisité), un signature Cosmo Club (que nos clients ne trouvent nulle part ailleurs), et un cocktail libre où chacun peut twister selon ses goûts. Possibilité d'inclure un mocktail pour les participants qui ne boivent pas — c'est même fortement recommandé.",
      "Côté formats, nous proposons trois grilles : atelier à domicile 6 à 8 personnes (idéal pour un EVJF intime, un anniversaire), atelier 8 à 12 personnes (le format médian, le plus fluide), et masterclass 15+ pour les team buildings et événements d'entreprise. Au-delà de 25-30 participants, nous mobilisons deux mixologues pour rester sur un rythme pédagogique.",
      "Côté lieu, nous intervenons à domicile (appartement, maison, loft, terrasse), en entreprise (vos locaux, un séminaire, une journée d'intégration), ou dans des lieux partenaires sur Paris si vous n'avez pas l'espace. Durée standard : 1h30 à 2h. Tout l'équipement est fourni, vous ne préparez rien.",
    ],
  },
  timeline: [
    {
      label: "Brief atelier",
      body: "Échange pour comprendre votre groupe : nombre de participants, niveau (débutants ou amateurs avertis), occasion, lieu.",
    },
    {
      label: "Proposition",
      body: "Plaquette envoyée sous 48 h : format suggéré, sélection des cocktails, planning de l'atelier, chiffrage.",
    },
    {
      label: "Personnalisation",
      body: "Nous ajustons les recettes selon les goûts du groupe et les ingrédients de saison. Cartes imprimées prêtes pour le jour J.",
    },
    {
      label: "Le jour J",
      body: "Installation 45 min avant le démarrage, atelier 1h30 à 2h, dégustation, nettoyage. Vous repartez avec les recettes.",
    },
  ],
  faq: [
    {
      q: "Combien de personnes peuvent participer à un atelier ?",
      a: "Nous proposons trois formats principaux : 6 à 8 personnes (atelier intime à domicile), 8 à 12 (le format médian), 15+ pour les team buildings et événements d'entreprise. Au-delà de 25-30 participants, on mobilise deux mixologues pour maintenir un rythme pédagogique.",
    },
    {
      q: "Est-ce adapté à des débutants ?",
      a: "Oui, c'est même notre cible principale. Nos mixologues expliquent les fondamentaux clairement, sans jargon. À la fin de l'atelier, chaque participant repart avec trois cocktails maîtrisés et la capacité de les refaire à la maison.",
    },
    {
      q: "Peut-on inclure des cocktails sans alcool dans l'atelier ?",
      a: "Oui, c'est même fortement recommandé si certains participants ne boivent pas. Nos mocktails sont conçus avec la même exigence que les cocktails alcoolisés. Pour un atelier 100% sans alcool, c'est aussi possible — dites-le simplement.",
    },
    {
      q: "Êtes-vous disponibles pour les EVJF / EVG ?",
      a: "Oui, c'est un format très demandé. L'atelier EVJF/EVG se cale souvent sur 8-12 personnes, à domicile ou dans un airbnb privatisé. Nous adaptons le ton, la carte, et pouvons personnaliser un cocktail au nom de la future mariée ou du futur marié.",
    },
    {
      q: "Pouvez-vous animer dans nos locaux d'entreprise ?",
      a: "Oui, nous nous déplaçons dans Paris et en Île-de-France. Nous validons en amont les contraintes du lieu (point d'eau, électricité, espace disponible) et installons un poste de mixologie pour chaque participant.",
    },
    {
      q: "Fournissez-vous les recettes après l'atelier ?",
      a: "Oui, chaque participant repart avec une carte imprimée des cocktails travaillés pendant l'atelier. Sur demande, nous pouvons envoyer un PDF des recettes par email après la session, pour que vos invités puissent rejouer à la maison.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/anniversaire",
      label: "Bar à cocktails anniversaire",
      desc: "Pour un anniversaire avec service complet plutôt qu'un atelier participatif.",
    },
    {
      href: "/barman-prive-paris",
      label: "Barman privé Paris",
      desc: "Si vous préférez être servi plutôt qu'apprendre à composer vous-même.",
    },
    {
      href: "/bar-a-cocktails/entreprise",
      label: "Bar à cocktails entreprise",
      desc: "Pour un team building avec animation cocktail intégrée dans la journée.",
    },
  ],
  serviceJsonLd: {
    name: "Atelier mixologie et animation cocktail — Cosmo Club Paris",
    description:
      "Atelier mixologie et masterclass cocktail à Paris : EVJF, EVG, team building, animation à domicile ou en entreprise. Mixologues professionnels, équipement fourni, 3 cocktails par participant.",
    serviceType: "Animation cocktail / atelier mixologie",
  },
};

export default async function AnimationPage() {
  const heroSrc = await getImagePath("animation-cocktail-paris", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
