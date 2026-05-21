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
      q: "Combien de personnes peuvent participer à un atelier mixologie à Paris ?",
      a: "Cosmo Club Paris propose trois formats d'atelier mixologie pensés pour des dynamiques de groupe différentes. Le format intime (6 à 8 personnes) est idéal pour un atelier à domicile, un EVJF resserré ou une soirée entre amis ; chaque participant a un poste de travail individuel et un temps d'échange personnalisé avec le mixologue. Le format médian (8 à 12 personnes) reste très interactif tout en accueillant un groupe d'amis élargi ou une petite équipe d'entreprise ; le rythme pédagogique est fluide, chacun reste au centre de l'attention. Le format team building (15 à 30 personnes) est pensé pour les groupes d'entreprise : organisation en deux à quatre îlots, rotation entre techniques (shake, build, infusion), challenge cocktail entre équipes en fin de session. Au-delà de 25-30 participants, nous mobilisons deux mixologues en parallèle pour maintenir un rythme pédagogique correct et garantir que personne ne se sente noyé dans la masse. Pour les très gros formats (50+), nous calibrons sur-mesure.",
    },
    {
      q: "Est-ce adapté à des débutants complets en mixologie ?",
      a: "Oui, les ateliers Cosmo Club Paris sont conçus en priorité pour des débutants — c'est même notre cible principale. La pédagogie repose sur trois principes : démystifier le bar de cocktail (les techniques sont expliquées avec un vocabulaire accessible, sans jargon professionnel inutile), construire en faisant (chaque participant manipule, shake, verse, dose dès les premières minutes — il n'y a pas de longue introduction théorique), et finir avec une vraie compétence transférable (à la fin de l'atelier, chaque participant a réalisé 3 cocktails de A à Z et sait les refaire chez lui avec une vraie reproductibilité). Le mixologue qui anime adapte son niveau de vocabulaire au groupe — pour un EVJF d'amies qui se découvrent l'univers du bar, le ton est ludique et accessible ; pour un team building de cadres avec une appétence pour la technique, le contenu est plus pointu. Aucun pré-requis n'est nécessaire pour participer.",
    },
    {
      q: "Peut-on inclure des cocktails sans alcool dans l'atelier mixologie ?",
      a: "Oui, l'inclusion de mocktails dans un atelier mixologie Cosmo Club Paris est non seulement possible mais fortement recommandée si certains participants ne boivent pas — pour des raisons religieuses, médicales, de grossesse, ou simplement par choix. Nos mocktails (cocktails sans alcool) sont conçus avec la même exigence technique que les cocktails alcoolisés : ingrédients premium (purées de fruits frais, sirops maison, jus pressés, infusions à froid), techniques de mixologie identiques (shake, build, stir, muddle), présentation soignée dans la même verrerie. Aucune sensation de « lot de consolation » pour les participants non-buveurs. Pour un atelier 100 % sans alcool — sur un EVJF de jeune maman, un team building dans une entreprise multi-confessionnelle, ou un anniversaire familial multi-générationnel — toute la carte est adaptée en compositions sans alcool. La même richesse aromatique (amer, frais, complexe, fruité, herbacé) reste accessible. Précisez votre besoin au brief, on adapte sans surcoût.",
    },
    {
      q: "Êtes-vous disponibles pour les EVJF et EVG à Paris ?",
      a: "Oui, l'EVJF et l'EVG sont parmi les formats d'atelier mixologie les plus demandés à Cosmo Club Paris — particulièrement entre mai et septembre, période de pointe pour les enterrements de vie de jeune fille et de jeune homme. Le format type pour un EVJF/EVG cocktail se cale sur 8 à 12 participantes ou participants, dans un appartement parisien, un airbnb privatisé pour le weekend, ou un loft loué pour l'occasion. La durée standard est de 1h30 à 2h, parfois prolongée à 2h30 si le groupe veut enchaîner plusieurs sessions. Nous adaptons trois variables au profil du groupe : le ton de l'animation (festif, complice, premium), la carte des cocktails (signature plus créative, sans-alcool en parallèle pour les non-buveuses ou femmes enceintes), et la personnalisation. Nous pouvons créer un cocktail signature au nom de la future mariée ou du futur marié avec une histoire courte imprimée sur la carte — c'est souvent le moment fort de l'EVJF que les invitées photographient et postent.",
    },
    {
      q: "Pouvez-vous animer un atelier mixologie dans nos locaux d'entreprise ?",
      a: "Oui, l'animation d'atelier mixologie en entreprise sur Paris et en Île-de-France est l'un des formats les plus actifs de Cosmo Club Paris — notamment pour les team buildings, les soirées de fin d'année, les célébrations de closing ou d'événements internes. Nous nous déplaçons dans vos locaux à Paris intra-muros et dans toute l'Île-de-France. La logistique d'un atelier en entreprise est validée en amont selon quatre critères : présence d'un point d'eau (idéalement à proximité de l'espace d'atelier pour le nettoyage des shakers et verres entre chaque cocktail), accès électrique (16 ampères suffisants en standard), espace disponible (compter environ 1m² par participant pour qu'il puisse travailler confortablement), et flux de circulation pour la fin d'atelier (transition dégustation). Nous installons un poste de mixologie par participant ou par binôme selon la taille du groupe, avec tout le matériel (shakers, verres, ingrédients, tabliers Cosmo Club si demandé). Le format standard dure 1h30 à 2h, idéal en fin de journée vers 17h-18h.",
    },
    {
      q: "Fournissez-vous les recettes des cocktails après l'atelier ?",
      a: "Oui, chaque participant à un atelier mixologie Cosmo Club Paris repart systématiquement avec une carte cocktails imprimée des recettes travaillées pendant la session — c'est inclus dans la prestation de base, sans surcoût. La carte est éditée à votre charte si vous le souhaitez (couleurs et logo de votre marque pour un événement d'entreprise, prénom de la future mariée pour un EVJF, théâtralisation du nouvel âge pour un anniversaire). Elle reprend les trois cocktails réalisés avec les proportions exactes, les techniques de préparation, et les variations possibles (substitution d'ingrédient, version sans alcool, dosage adapté). Sur demande explicite au brief, nous pouvons aussi envoyer un PDF complet des recettes par email à l'organisateur après la session, pour que vos invités puissent rejouer à la maison sans avoir à conserver la carte papier. Pour les ateliers d'entreprise, ce PDF est parfois intégré dans le compte-rendu post-événement envoyé aux équipes.",
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
  howToName:
    "Comment organiser un atelier mixologie ou une animation cocktail à Paris",
};

export default async function AnimationPage() {
  const heroSrc = await getImagePath("animation-cocktail-paris", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
