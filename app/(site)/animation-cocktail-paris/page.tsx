import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";
import { ogDefaults } from "@/lib/seo-og";

const SLUG = "/animation-cocktail-paris";
const FALLBACK_HERO = "/brand/ai/bento-bar-cocktails.png";

// Recentrage B2B (audit SEO du 11/10/2026) : la Search Console montre
// ~2 900 impressions sur « animation cocktail entreprise », « team
// building cocktail », « cocktails entreprise » (0 clic, position 17-26)
// et c'est cette page que Google associe à ces requêtes, pas
// /bar-a-cocktails/entreprise. Les formats privés (anniversaire, EVJF :
// 9 impressions en 5 mois) restent mentionnés mais passent au second plan.
export const metadata: Metadata = {
  title: "Animation cocktail entreprise & team building Paris",
  description:
    "Animation cocktail et atelier mixologie en entreprise à Paris et en Île-de-France : team building, séminaire, soirée corporate. Devis sous 48 h.",
  keywords: [
    "animation cocktail entreprise",
    "animation cocktail entreprise Paris",
    "team building cocktail Paris",
    "atelier cocktail team building",
    "atelier mixologie entreprise",
    "cocktails entreprise",
    "animation cocktail Paris",
    "atelier mixologie Paris",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    ...ogDefaults(),
    title: "Animation cocktail entreprise Paris — Cosmo Club",
    description:
      "Atelier mixologie et animation cocktail pour vos équipes : team building, séminaire, soirée corporate, dans vos locaux ou en lieu partenaire.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Animation cocktail entreprise",
  h1: "Animation cocktail entreprise et team building à Paris.",
  h1Accent: "team building",
  subtitle:
    "Un mixologue professionnel anime vos équipes dans vos locaux, en séminaire ou en soirée corporate : atelier participatif, trois cocktails par personne, matériel fourni.",
  heroSrc: FALLBACK_HERO,
  intro: [
    "Une animation cocktail d'entreprise Cosmo Club, c'est un atelier mixologie participatif de 1h30 à 2h, animé par un mixologue professionnel, dans vos locaux à Paris, en Île-de-France ou dans un lieu partenaire. Chaque participant compose trois cocktails à son poste, avec tout le matériel et les ingrédients fournis.",
    "Le format s'adapte à votre effectif : masterclass de 15 à 30 personnes organisée en îlots avec challenge entre équipes, deux mixologues au-delà de 25 participants, et formats sur mesure pour les grands groupes. Team building, séminaire, soirée de fin d'année ou célébration interne : nous calibrons le ton, la carte et la logistique selon votre événement. Les formats privés (anniversaire, EVJF) existent aussi, en groupe de 6 à 12.",
  ],
  pillars: [
    {
      title: "Un format pédagogique sans être scolaire",
      body: "Nos mixologues expliquent, démontrent, font goûter. Vous reproduisez avec eux, à votre rythme. Pas de théorie inutile : on apprend en faisant, et on boit ce qu'on fabrique.",
    },
    {
      title: "Calibré pour les équipes",
      body: "Masterclass de 15 à 30 personnes pour les team buildings, organisée en deux à quatre îlots avec rotation des techniques et challenge cocktail entre équipes. Formats 8 à 12 et 6 à 8 personnes pour les petites équipes et les événements privés.",
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
    title: "Comment se déroule une animation cocktail Cosmo Club.",
    paragraphs: [
      "L'atelier commence par une introduction courte (15-20 min) : grandes familles de cocktails, techniques fondamentales (build, shake, stir), ingrédients clés. Notre mixologue démontre devant le groupe, puis chaque participant reproduit à son poste avec son propre matériel.",
      "Nous travaillons généralement trois cocktails : un classique (mojito, margarita, old fashioned ou cosmopolitan revisité), un signature Cosmo Club (que nos clients ne trouvent nulle part ailleurs), et un cocktail libre où chacun peut twister selon ses goûts. Possibilité d'inclure un mocktail pour les participants qui ne boivent pas — c'est même fortement recommandé.",
      "Côté formats, la masterclass 15+ est le format entreprise de référence : organisation en îlots, rotation entre les techniques, challenge final entre équipes. Au-delà de 25-30 participants, nous mobilisons deux mixologues pour rester sur un rythme pédagogique. Les formats 8 à 12 personnes et 6 à 8 personnes restent disponibles pour les petites équipes et les événements privés (anniversaire, EVJF).",
      "Côté lieu, nous intervenons dans vos locaux (open space, salle de réunion, rooftop), sur votre séminaire ou votre journée d'intégration, dans un lieu partenaire sur Paris si vous n'avez pas l'espace, ou à domicile pour les formats privés. Durée standard : 1h30 à 2h. Tout l'équipement est fourni, vous ne préparez rien.",
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
      body: "Nous ajustons les recettes selon les goûts du groupe et les ingrédients de saison. Cartes imprimées prêtes pour le jour J, à votre charte si vous le souhaitez.",
    },
    {
      label: "Le jour J",
      body: "Installation 45 min avant le démarrage, atelier 1h30 à 2h, dégustation, nettoyage. Vos équipes repartent avec les recettes.",
    },
  ],
  faq: [
    {
      q: "Pouvez-vous animer un atelier mixologie dans nos locaux d'entreprise ?",
      a: "Oui, l'animation d'atelier mixologie en entreprise sur Paris et en Île-de-France est l'un des formats les plus actifs de Cosmo Club Paris — notamment pour les team buildings, les soirées de fin d'année, les célébrations de closing ou d'événements internes. Nous nous déplaçons dans vos locaux à Paris intra-muros et dans toute l'Île-de-France. La logistique d'un atelier en entreprise est validée en amont selon quatre critères : présence d'un point d'eau (idéalement à proximité de l'espace d'atelier pour le nettoyage des shakers et verres entre chaque cocktail), accès électrique (16 ampères suffisants en standard), espace disponible (compter environ 1m² par participant pour qu'il puisse travailler confortablement), et flux de circulation pour la fin d'atelier (transition dégustation). Nous installons un poste de mixologie par participant ou par binôme selon la taille du groupe, avec tout le matériel (shakers, verres, ingrédients, tabliers Cosmo Club si demandé). Le format standard dure 1h30 à 2h, idéal en fin de journée vers 17h-18h.",
    },
    {
      q: "Combien de personnes peuvent participer à une animation cocktail entreprise à Paris ?",
      a: "Cosmo Club Paris propose trois formats d'atelier mixologie pensés pour des dynamiques de groupe différentes. Le format team building (15 à 30 personnes) est pensé pour les groupes d'entreprise : organisation en deux à quatre îlots, rotation entre techniques (shake, build, infusion), challenge cocktail entre équipes en fin de session. Au-delà de 25-30 participants, nous mobilisons deux mixologues en parallèle pour maintenir un rythme pédagogique correct et garantir que personne ne se sente noyé dans la masse. Pour les très gros formats (50+), nous calibrons sur-mesure. Le format médian (8 à 12 personnes) convient à une petite équipe ou à un groupe d'amis élargi ; le rythme pédagogique est fluide, chacun reste au centre de l'attention. Le format intime (6 à 8 personnes) est idéal pour un atelier à domicile ou une soirée entre amis ; chaque participant a un poste de travail individuel et un temps d'échange personnalisé avec le mixologue.",
    },
    {
      q: "Est-ce adapté à des débutants complets en mixologie ?",
      a: "Oui, les ateliers Cosmo Club Paris sont conçus en priorité pour des débutants — c'est même notre cible principale. La pédagogie repose sur trois principes : démystifier le bar de cocktail (les techniques sont expliquées avec un vocabulaire accessible, sans jargon professionnel inutile), construire en faisant (chaque participant manipule, shake, verse, dose dès les premières minutes — il n'y a pas de longue introduction théorique), et finir avec une vraie compétence transférable (à la fin de l'atelier, chaque participant a réalisé 3 cocktails de A à Z et sait les refaire chez lui avec une vraie reproductibilité). Le mixologue qui anime adapte son niveau de vocabulaire au groupe — pour un team building de cadres avec une appétence pour la technique, le contenu est plus pointu ; pour un groupe d'amis qui découvre l'univers du bar, le ton est ludique et accessible. Aucun pré-requis n'est nécessaire pour participer.",
    },
    {
      q: "Peut-on inclure des cocktails sans alcool dans l'atelier mixologie ?",
      a: "Oui, l'inclusion de mocktails dans un atelier mixologie Cosmo Club Paris est non seulement possible mais fortement recommandée si certains participants ne boivent pas — pour des raisons religieuses, médicales, de grossesse, ou simplement par choix. Nos mocktails (cocktails sans alcool) sont conçus avec la même exigence technique que les cocktails alcoolisés : ingrédients premium (purées de fruits frais, sirops maison, jus pressés, infusions à froid), techniques de mixologie identiques (shake, build, stir, muddle), présentation soignée dans la même verrerie. Aucune sensation de « lot de consolation » pour les participants non-buveurs. Pour un atelier 100 % sans alcool — sur un team building dans une entreprise multi-confessionnelle, un EVJF de jeune maman, ou un anniversaire familial multi-générationnel — toute la carte est adaptée en compositions sans alcool. La même richesse aromatique (amer, frais, complexe, fruité, herbacé) reste accessible. Précisez votre besoin au brief, on adapte sans surcoût.",
    },
    {
      q: "Fournissez-vous les recettes des cocktails après l'atelier ?",
      a: "Oui, chaque participant à un atelier mixologie Cosmo Club Paris repart systématiquement avec une carte cocktails imprimée des recettes travaillées pendant la session — c'est inclus dans la prestation de base, sans surcoût. La carte est éditée à votre charte si vous le souhaitez (couleurs et logo de votre marque pour un événement d'entreprise, prénom de la future mariée pour un EVJF, théâtralisation du nouvel âge pour un anniversaire). Elle reprend les trois cocktails réalisés avec les proportions exactes, les techniques de préparation, et les variations possibles (substitution d'ingrédient, version sans alcool, dosage adapté). Sur demande explicite au brief, nous pouvons aussi envoyer un PDF complet des recettes par email à l'organisateur après la session, pour que vos invités puissent rejouer à la maison sans avoir à conserver la carte papier. Pour les ateliers d'entreprise, ce PDF est parfois intégré dans le compte-rendu post-événement envoyé aux équipes.",
    },
    {
      q: "Proposez-vous aussi l'atelier pour un EVJF, un EVG ou un anniversaire ?",
      a: "Oui, l'EVJF et l'EVG sont parmi les formats d'atelier mixologie les plus demandés à Cosmo Club Paris — particulièrement entre mai et septembre, période de pointe pour les enterrements de vie de jeune fille et de jeune homme. Le format type pour un EVJF/EVG cocktail se cale sur 8 à 12 participantes ou participants, dans un appartement parisien, un airbnb privatisé pour le weekend, ou un loft loué pour l'occasion. La durée standard est de 1h30 à 2h, parfois prolongée à 2h30 si le groupe veut enchaîner plusieurs sessions. Nous adaptons trois variables au profil du groupe : le ton de l'animation (festif, complice, premium), la carte des cocktails (signature plus créative, sans-alcool en parallèle pour les non-buveuses ou femmes enceintes), et la personnalisation. Nous pouvons créer un cocktail signature au nom de la future mariée ou du futur marié avec une histoire courte imprimée sur la carte — c'est souvent le moment fort de l'EVJF que les invitées photographient et postent.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/entreprise",
      label: "Bar à cocktails entreprise",
      desc: "Un bar servi pour votre soirée d'entreprise, en complément de l'atelier ou à sa place.",
    },
    {
      href: "/barman-prive-paris",
      label: "Barman privé Paris",
      desc: "Si vous préférez être servi plutôt qu'apprendre à composer vous-même.",
    },
    {
      href: "/bar-a-cocktails/anniversaire",
      label: "Bar à cocktails anniversaire",
      desc: "Pour un anniversaire avec service complet plutôt qu'un atelier participatif.",
    },
  ],
  serviceJsonLd: {
    name: "Animation cocktail entreprise et team building — Cosmo Club Paris",
    description:
      "Animation cocktail et atelier mixologie pour les entreprises à Paris et en Île-de-France : team building, séminaire, soirée corporate. Mixologues professionnels, équipement fourni, 3 cocktails par participant. Formats privés (anniversaire, EVJF) disponibles.",
    serviceType: "Animation cocktail entreprise / team building mixologie",
  },
  howToName:
    "Comment organiser une animation cocktail ou un team building mixologie en entreprise à Paris",
};

export default async function AnimationPage() {
  const heroSrc = await getImagePath("animation-cocktail-paris", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
