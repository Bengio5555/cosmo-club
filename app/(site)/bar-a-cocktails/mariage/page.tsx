import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";

const SLUG = "/bar-a-cocktails/mariage";
const FALLBACK_HERO = "/brand/ai/hero-bar-cocktails.png";

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
  heroSrc: FALLBACK_HERO,
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
      a: "Pour un mariage en haute saison (mai à septembre), réserver son bar à cocktails entre 6 et 9 mois avant la date est la fenêtre idéale, particulièrement pour les samedis de juin, juillet et fin août qui partent souvent en premier. Cette avance permet de bloquer la date, d'organiser une visite du lieu avec le prestataire, de co-concevoir la carte signature en plusieurs itérations, et de finaliser la scénographie du bar en cohérence avec votre décoration. Pour les mariages en basse saison (octobre à avril) ou en semaine, un délai de 2 à 4 mois est généralement suffisant. Si votre date est proche, signalez-le directement : la plupart des prestataires sérieux gardent une flexibilité de dernière minute pour des projets bien cadrés. L'essentiel est de ne pas réserver par défaut un service générique faute de temps — la différence de rendu entre un bar événementiel premium et un bar de traiteur standard est visible au premier regard.",
    },
    {
      q: "Faites-vous des cocktails sans alcool pour les invités qui ne boivent pas ?",
      a: "Oui, la carte mocktails fait partie de chaque prestation mariage Cosmo Club Paris, sans surcoût. Elle est construite avec la même exigence que la carte alcoolisée : ingrédients premium (purées de fruits frais, sirops maison, jus pressés du jour, infusions à froid), présentation soignée dans la même verrerie, et une vraie identité gustative. Trois à quatre mocktails signatures sont proposés en parallèle des cocktails classiques, avec des accords aromatiques qui assument le sans-alcool comme une catégorie à part entière — pas un repli. Vos invitées enceintes, vos invités sportifs, ceux qui ne boivent pas pour des raisons religieuses ou personnelles, et les enfants si vous le souhaitez, trouvent une option qui les inclut pleinement. Cette approche compte particulièrement pour les mariages où une part significative des invités est non-buveuse — c'est un détail invisible mais qui change la qualité de présence de chacun à la soirée.",
    },
    {
      q: "Pouvez-vous créer un cocktail signature à notre nom ?",
      a: "Oui, c'est l'une des prestations les plus demandées sur nos mariages. Nous concevons un ou deux cocktails dédiés à votre couple, avec un nom évocateur, un ingrédient totem qui fait sens dans votre histoire (le rhum d'une lune de miel passée à Cuba, la lavande du Sud de la France où vous vous êtes rencontrés, le yuzu d'un voyage au Japon), et une courte histoire imprimée sur la carte. La conception se fait en 2 à 3 itérations : un brief créatif, une dégustation de 2-3 propositions à notre atelier ou par envoi (selon votre disponibilité), puis l'arbitrage final. Sur un mariage de 80-150 invités, c'est ce cocktail signature qui s'imprime dans les mémoires — il est commenté à table, photographié, ressort dans les souvenirs des invités six mois après la soirée. C'est souvent ce détail qui transforme un bel événement en un mariage dont on parle.",
    },
    {
      q: "Intervenez-vous dans toute l'Île-de-France ?",
      a: "Oui, nous nous déplaçons dans tout Paris intra-muros et dans toute l'Île-de-France (Yvelines, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne, Essonne, Val-d'Oise, Seine-et-Marne). Les frais de déplacement à Paris intra-muros sont inclus dans la prestation. Pour les départements limitrophes, un défraiement raisonnable est ajouté au devis selon la distance. Pour les destinations hors région — par exemple un mariage dans un château en Bourgogne, en Provence ou en Normandie — nous étudions chaque projet au cas par cas en fonction de la logistique de votre lieu : accessibilité camion pour l'installation, présence d'un point d'eau et d'électricité, possibilité d'héberger l'équipe la veille si nécessaire. Nous avons l'habitude des mariages destination en France et travaillons régulièrement avec des wedding planners qui gèrent ce type d'événement hors zone urbaine.",
    },
    {
      q: "Personnalisez-vous le bar aux couleurs du mariage ?",
      a: "Oui, la personnalisation visuelle du bar fait partie intégrante de notre approche. Six leviers de personnalisation sont disponibles : sticker pleine façade reprenant votre monogramme ou direction artistique, glaçons gravés au logo ou aux initiales (logo, fleur comestible, feuille d'or), pastilles comestibles flottant à la surface du cocktail avec votre motif imprimé, toppings fruits sculptés aux initiales, pochoirs sur mousse de latte ou de cappuccino, néon sur mesure pour la scénographie d'ambiance. La composition florale du bar et l'impression des cartes cocktails sont offertes — elles font partie du service de base. Les éléments plus complexes (néon, scénographie sur-mesure complète) sont chiffrés au devis selon votre vision. L'objectif : que le bar lise comme une extension de votre direction artistique, pas comme un meuble générique posé dans le décor.",
    },
    {
      q: "Avez-vous une assurance et toutes les autorisations nécessaires pour un mariage ?",
      a: "Oui, Cosmo Club Paris dispose de tous les documents légaux requis pour intervenir en prestation événementielle de débit de boissons : assurance responsabilité civile professionnelle (RC Pro), licence III pour le débit de boissons alcoolisées de moins de 18 degrés, déclaration ouverte en mairie et au préfet de Paris. Tous nos mixologues, baristas et chef de salle sont déclarés en bonne et due forme, formés à la sécurité alimentaire (HACCP) et au service responsable. Nous fournissons systématiquement les attestations à votre lieu de réception sur simple demande, dans le délai imposé par le contrat de location de la salle — la plupart des châteaux et domaines de mariage les exigent 2 à 4 semaines avant la date. Cette conformité est un standard pour tout prestataire sérieux à Paris ; refusez tout devis qui ne mentionne pas explicitement ces attestations.",
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

export default async function MariagePage() {
  const heroSrc = await getImagePath("bar-a-cocktails-mariage", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
