import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";

const SLUG = "/barman-prive-paris";

export const metadata: Metadata = {
  title: "Barman privé Paris — Service mixologue à domicile et événement",
  description:
    "Barman privé à Paris et en Île-de-France pour vos événements à domicile, anniversaires, dîners et soirées privées. Mixologues professionnels, cartes signature, prestation clé en main. Devis sous 24 h.",
  keywords: [
    "barman privé Paris",
    "barman à domicile Paris",
    "mixologue privé Paris",
    "barman pour soirée privée",
    "service barman Paris",
    "louer un barman",
    "mixologue à domicile",
  ],
  alternates: { canonical: SLUG },
  openGraph: {
    title: "Barman privé Paris — Cosmo Club",
    description:
      "Mixologue professionnel pour vos soirées privées à domicile : carte signature, équipement, service de A à Z.",
    url: SLUG,
    type: "website",
  },
};

const config: LandingConfig = {
  slug: SLUG,
  eyebrow: "Barman privé",
  h1: "Un barman privé pour votre soirée.",
  h1Accent: "barman",
  subtitle:
    "Mixologue professionnel à domicile à Paris et en Île-de-France. Carte signature, équipement complet, service du début à la fin — vous restez côté invités.",
  heroSrc: "/brand/ai/hero-bar-cocktails.png",
  intro: [
    "Un barman privé, ce n'est pas un serveur qui ouvre des bouteilles. C'est un professionnel formé à la mixologie, qui prend en main votre soirée, anime le bar, gère le service, et libère votre maîtresse de maison ou maître de maison de toute la logistique boissons.",
    "Cosmo Club met à votre disposition des mixologues sélectionnés pour leur technique et leur posture, pour vos dîners privés, anniversaires à domicile, soirées entre amis, événements familiaux ou réceptions à enjeu.",
  ],
  pillars: [
    {
      title: "Un vrai mixologue, pas un serveur",
      body: "Nos barmen ont l'expérience des grands événements : technique précise, sens du timing, capacité à animer le bar sans s'imposer, et à converser avec vos invités quand c'est attendu.",
    },
    {
      title: "Équipement complet apporté",
      body: "Verrerie, shakers, mesures, glace, garnitures, ingrédients : tout est inclus. Vous n'avez rien à acheter, rien à préparer. Nous arrivons une heure avant le début pour installer.",
    },
    {
      title: "Une carte adaptée à votre soirée",
      body: "Cocktails Classico (les classiques exécutés correctement), Cosmo (nos signatures), Émotion (créations sur mesure) ou Mocktails. Nous adaptons la carte à votre format — dîner, apéritif, anniversaire, after.",
    },
    {
      title: "Service de A à Z",
      body: "Installation, service pendant la soirée, nettoyage du bar, reprise du matériel. Vous restez auprès de vos invités, jamais derrière le bar.",
    },
  ],
  experience: {
    title: "Ce que comprend la prestation.",
    paragraphs: [
      "Selon votre format, nous mobilisons un mixologue solo (pour les dîners et petits formats) ou un binôme mixologue + commis pour les soirées plus dimensionnées. Nous nous adaptons à votre lieu — appartement haussmannien, loft, maison, terrasse — et validons en amont les contraintes (point d'eau, électricité, espace bar disponible).",
      "Côté carte, vous choisissez parmi nos univers signatures ou nous co-écrivons la carte avec vous. Pour un dîner gastronomique, nous proposons souvent un cocktail d'accueil signature, un cocktail palate cleanser entre les plats, un digestif twisté. Pour une soirée d'anniversaire à domicile, on travaille plutôt une carte de 4 à 6 cocktails avec une signature à votre prénom.",
      "Côté matériel, nous arrivons avec tout : verrerie premium (verres à cocktails, tumbler, coupes selon les recettes), shakers, mesures, fontaines à glace, garnitures fraîches du jour, ingrédients de qualité. Vous n'avez pas à courir le matin chez Picard ou Metro.",
      "Côté logistique, nous arrivons une heure avant le début de la soirée pour installer dans le calme, nous travaillons pendant l'événement, et nous remballons à la fin. Une option « majoration reprise J+1 » est disponible si vous préférez que nous récupérions le matériel le lendemain pour vous laisser dormir.",
    ],
  },
  timeline: [
    {
      label: "Premier échange",
      body: "Appel ou message pour comprendre votre soirée : format, nombre d'invités, lieu, ambiance recherchée.",
    },
    {
      label: "Proposition",
      body: "Plaquette envoyée sous 24 h : carte cocktails suggérée, format (solo ou binôme), chiffrage transparent.",
    },
    {
      label: "Validation",
      body: "Carte finalisée à J-7, débrief lieu (accès, point d'eau, électricité), acompte de réservation par virement ou CB.",
    },
    {
      label: "Le jour J",
      body: "Arrivée 1h avant les invités, installation discrète, service tout au long de la soirée, reprise en fin d'événement.",
    },
  ],
  faq: [
    {
      q: "À partir de combien d'invités prenez-vous un barman privé ?",
      a: "Nous nous adaptons à des dîners intimes (10-12 personnes) comme à des soirées de 50+ invités. Pour les petits formats, un mixologue solo suffit. Au-delà de 30-40 invités, nous proposons généralement un binôme mixologue + commis pour fluidifier le service.",
    },
    {
      q: "Apportez-vous le matériel et les ingrédients ?",
      a: "Oui, tout est inclus : verrerie, shakers, mesures, glace, garnitures fraîches, spiritueux et ingrédients. Vous n'avez à fournir que le lieu et un point d'eau accessible. Si vous avez des verres particuliers que vous voulez utiliser, on s'adapte.",
    },
    {
      q: "Pouvons-nous personnaliser la carte ?",
      a: "Oui, c'est même recommandé. Nous co-écrivons la carte avec vous : cocktail signature à votre prénom, twists sur vos boissons préférées, mocktails pour ceux qui ne boivent pas, shot fruité en clôture. La carte est imprimée et fournie sur place.",
    },
    {
      q: "Combien de temps avant l'événement faut-il vous réserver ?",
      a: "Le plus tôt est le mieux, surtout pour les périodes chargées (mai-juin, septembre-décembre). Cela dit, nous trouvons souvent une solution en délai resserré : si votre soirée est proche, contactez-nous quand même.",
    },
    {
      q: "Quels formats de bar proposez-vous à domicile ?",
      a: "Pour un appartement, on travaille soit avec un bar miroir compact (1m60) qui s'installe en moins de 30 minutes, soit sur votre îlot de cuisine / votre console si l'espace ne permet pas de monter un bar. Pour les terrasses et lofts, on peut aller jusqu'à un bar miroir 6 baies ou un bar bois.",
    },
    {
      q: "Êtes-vous assurés ?",
      a: "Oui : RC professionnelle, licence III pour le débit de boissons. Nos mixologues sont déclarés et formés. Nous fournissons les attestations sur simple demande.",
    },
  ],
  related: [
    {
      href: "/bar-a-cocktails/anniversaire",
      label: "Bar à cocktails anniversaire",
      desc: "La formule complète avec bar scénographié, pour les soirées d'envergure.",
    },
    {
      href: "/bar-a-cocktails/mariage",
      label: "Bar à cocktails mariage",
      desc: "Pour les unions : carte signature, scénographie, équipe étoffée.",
    },
    {
      href: "/animation-cocktail-paris",
      label: "Animation cocktail Paris",
      desc: "Animation et masterclass cocktails à domicile ou en entreprise.",
    },
  ],
  serviceJsonLd: {
    name: "Barman privé — Cosmo Club Paris",
    description:
      "Service de barman privé à domicile à Paris et en Île-de-France pour soirées privées, anniversaires, dîners et événements familiaux. Mixologue professionnel, matériel et ingrédients fournis, carte sur mesure.",
    serviceType: "Barman privé événementiel",
  },
};

export default function BarmanPrivePage() {
  return <LandingPage config={config} />;
}
