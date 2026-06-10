import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";

const SLUG = "/bar-a-cocktails/entreprise";
const FALLBACK_HERO = "/brand/ai/hero-bar.png";

export const metadata: Metadata = {
  title: "Bar à cocktails entreprise & corporate Paris",
  description:
    "Bar à cocktails pour entreprises à Paris : soirées corporate, séminaires, lancements. Carte sur-mesure, bar aux couleurs de votre marque. Devis 24 h.",
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
  heroSrc: FALLBACK_HERO,
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
      a: "Oui, les collaborations avec agences événementielles constituent une part importante de l'activité de Cosmo Club Paris. Nous travaillons régulièrement avec des wedding planners, des agences corporate B2B, des agences de communication et de production événementielle, ainsi qu'avec les services événementiels internes de grands groupes. Un système d'apporteur d'affaires est en place et formalisé contractuellement : commission négociée selon le volume et la récurrence, devis brut transmis à l'agence puis répercuté au client final, transparence totale sur la facturation. Nous savons nous adapter aux modes opératoires de chaque agence : devis en marque blanche, équipe identifiée sous votre nom client, briefs structurés, livraison de comptes-rendus post-événement. Les agences qui collaborent avec nous valorisent notamment la fiabilité opérationnelle (jamais d'annulation, jamais de retard, prestation calibrée au tempo) et la qualité visuelle (les visuels post-event circulent sur LinkedIn et Instagram avec leurs propres clients en commentaire). Contactez-nous pour le détail des conditions.",
    },
    {
      q: "Pouvez-vous brander entièrement le bar à nos couleurs ?",
      a: "Oui, le branding intégral du bar fait partie de l'offre Cosmo Club Paris pour les événements d'entreprise — c'est même l'un des leviers visuels les plus efficaces pour transformer une soirée corporate en moment de marque mémorisable. Sept éléments peuvent être personnalisés : sticker pleine façade (1m20 minimum, jusqu'à plusieurs mètres pour les bars panoramiques), pochoirs imprimés sur la mousse des cocktails et lattes, glaçons gravés au logo, pastilles comestibles flottant à la surface, néon sur mesure pour la scénographie d'ambiance, signalétique de menu cohérente avec votre charte, et tenues d'équipe coordonnées si demandées. Les compositions florales du bar et l'impression des menus cocktails sont incluses dans la prestation. Les éléments plus complexes (néon dimensionné, scénographie complète, mobilier sur-mesure) sont chiffrés au devis selon votre direction artistique. Nous travaillons systématiquement depuis votre charte graphique (logos, palette, typo) pour garantir la cohérence visuelle avec le reste de votre communication.",
    },
    {
      q: "Pouvez-vous créer un cocktail signature pour notre marque ?",
      a: "Oui, la création de cocktail signature de marque est l'une des prestations les plus demandées par les entreprises qui font appel à Cosmo Club Paris. Le processus se déroule en trois étapes : un brief créatif initial pour comprendre votre univers de marque (codes visuels, valeurs, produit phare, territoires d'expression), une session de conception qui débouche sur 2 à 4 propositions de cocktails (naming, ingrédients qui font sens, présentation visuelle), et une dégustation finale pour arbitrer. Chaque cocktail signature inclut un nom dédié, un ingrédient totem lié à votre univers (un café spécifique pour une marque torréfacteur, un agrume rare pour une marque de parfumerie, une infusion régionale pour une marque territoriale), et une présentation visuelle alignée sur votre charte. Pour un lancement de produit, c'est souvent le visuel de ce cocktail qui circule le plus sur LinkedIn, Instagram et les comptes presse en post-event — un ROI mesurable au-delà de la soirée elle-même.",
    },
    {
      q: "Quelles sont vos zones d'intervention pour les événements d'entreprise ?",
      a: "Cosmo Club Paris intervient en standard sur Paris intra-muros et toute l'Île-de-France (Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne, Yvelines, Essonne, Val-d'Oise, Seine-et-Marne). Les frais de déplacement à Paris intra-muros sont inclus dans la prestation de base. Pour les départements limitrophes, un forfait de livraison adapté à la zone est ajouté au devis. Pour les destinations hors région — séminaire à la campagne, événement client en région ou à l'étranger, lancement produit sur un salon professionnel hors Paris — nous étudions chaque projet au cas par cas selon la logistique (accessibilité du lieu, présence d'eau et d'électricité, hébergement de l'équipe la veille, transport du matériel). Nous avons déjà opéré pour des marques internationales sur des événements en France entière (Cannes, Lyon, Bordeaux, Deauville) ainsi que ponctuellement à l'étranger pour des projets de prestige. Contactez-nous avec le détail logistique de votre événement et nous revenons avec un devis cadré sous 48h.",
    },
    {
      q: "Quelles factures et attestations fournissez-vous au service achats ?",
      a: "Cosmo Club Paris fournit l'ensemble des documents nécessaires aux services achats et compliance des entreprises clientes : devis détaillé et facture TTC en bonne et due forme avec mention de TVA, SIRET, et conditions de paiement, attestation d'assurance responsabilité civile professionnelle (RC Pro), licence III pour le débit de boissons alcoolisées, déclaration ouverte en mairie et au préfet de Paris, et K-bis sur demande. Pour les entreprises qui passent par un référencement fournisseur formel, nous remplissons les questionnaires de mise en conformité (RGPD, RSE, attestations URSSAF, sécurité du personnel) dans les délais demandés. Les facturations peuvent être ventilées selon vos contraintes comptables (un devis par filiale, facturation interco, refacturation client final pour les agences). Délais de paiement adaptables : virement à 30 jours fin de mois en standard, négociable jusqu'à 60 jours pour les grands groupes. Tous les documents sont transmis dématérialisés au format PDF.",
    },
    {
      q: "Faites-vous les cocktails de fin d'année pour des équipes de 200+ personnes ?",
      a: "Oui, Cosmo Club Paris est dimensionné pour les soirées d'entreprise grand format, et la fin d'année (novembre-décembre) est l'une de nos périodes les plus actives. Pour les événements à partir de 200 invités, nous adaptons trois variables : la taille de l'équipe (jusqu'à 8 mixologues + baristas + chef de salle pour les très gros formats), le nombre de baies de service (jusqu'à 4 bars en parallèle pour éviter les files d'attente), et la carte cocktails (optimisée pour le débit — recettes rapides à monter sans sacrifier la qualité, présentation en service continu, prémontage des éléments délicats). Pour les très gros formats, nous validons en amont la logistique avec votre lieu de réception lors d'une visite de repérage : flux d'arrivée des invités, positionnement des bars dans l'espace, accès cuisine ou local technique pour le réassort, brief horaire (heure de pic prévue). Le tempo de service est calibré précisément pour éviter la double peine — attente trop longue ou bar saturé en fin de soirée.",
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
  howToName:
    "Comment organiser un bar à cocktails pour un événement d'entreprise à Paris",
};

export default async function EntreprisePage() {
  const heroSrc = await getImagePath("bar-a-cocktails-entreprise", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
