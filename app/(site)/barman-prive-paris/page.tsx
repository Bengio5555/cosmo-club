import type { Metadata } from "next";
import { LandingPage, type LandingConfig } from "@/components/landing/LandingPage";
import { getImagePath } from "@/lib/server/imagesConfig";

const SLUG = "/barman-prive-paris";
const FALLBACK_HERO = "/brand/ai/hero-bar-cocktails.png";

export const metadata: Metadata = {
  title: "Barman privé Paris — mixologue à domicile",
  description:
    "Barman privé à Paris et en Île-de-France : mixologue professionnel pour soirées à domicile, dîners et réceptions privées. Clé en main, devis 24 h.",
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
  heroSrc: FALLBACK_HERO,
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
      q: "À partir de combien d'invités prenez-vous un barman privé à Paris ?",
      a: "Le service de barman privé Cosmo Club Paris est dimensionné aussi bien pour un dîner intime (10-12 invités) que pour une soirée plus large (50-80 invités), avec un calibrage différent selon le format. Pour les dîners intimes (10-25 invités), un mixologue solo suffit largement à assurer un service fluide sans surdimensionner le dispositif — il prépare les cocktails au rythme calme d'un dîner assis, sans pression de file d'attente. Pour les formats médians (25-40 invités en cocktail debout), nous restons sur un mixologue solo mais avec un dimensionnement de carte resserré (4-5 cocktails plutôt que 8) pour éviter les ralentissements. Au-delà de 30-40 invités, ou pour les soirées avec un format service continu sur 3-4 heures, nous proposons généralement un binôme mixologue + commis : le mixologue gère la créativité et l'interaction client, le commis gère le réassort et la préparation des éléments en amont. Au-delà de 60, on bascule sur deux mixologues complets en parallèle.",
    },
    {
      q: "Apportez-vous le matériel et les ingrédients pour la prestation à domicile ?",
      a: "Oui, le service de barman privé Cosmo Club Paris est entièrement self-contained — vous n'avez rien à acheter en amont, ni à anticiper. Tout est inclus dans la prestation : verrerie professionnelle (verres à cocktails, verres à eau, flûtes selon la carte), shakers Boston et tin, mesures précises (jiggers), passoires, cuillère de bar, glace en quantité (cubes pour le shake, grosses billes pour le on-the-rocks, glace pilée pour le crushed), garnitures fraîches préparées au jour le jour (zestes d'agrumes, herbes, fruits, fleurs comestibles selon la carte), spiritueux et liqueurs sélectionnés au niveau de qualité requis par la carte, ingrédients maison (sirops, infusions, purées). Vous n'avez à fournir que le lieu (un espace pour le bar, dans une cuisine ouverte, sur une console ou en bar dédié) et un point d'eau accessible pour le nettoyage. Si vous avez des verres particuliers que vous voulez utiliser pour des raisons sentimentales ou esthétiques, dites-le simplement — on s'adapte.",
    },
    {
      q: "Pouvons-nous personnaliser la carte de cocktails du barman privé ?",
      a: "Oui, la personnalisation de la carte est l'une des dimensions où le service de barman privé Cosmo Club Paris se distingue d'un bar événementiel classique — c'est même fortement recommandé pour que la prestation prenne tout son sens. Nous co-écrivons la carte avec vous lors d'un brief de 20-30 minutes par téléphone : un cocktail signature à votre prénom ou aux initiales du couple si c'est une soirée à deux, des twists sur vos cocktails préférés (votre Old Fashioned habituel revisité avec une infusion de café, votre Spritz décliné avec un agrume rare), des mocktails élégants pour les invités qui ne boivent pas (compositions à part entière, pas du jus déguisé), et parfois un shot fruité ou amer en clôture de soirée. La carte finale est imprimée à votre charte (papier de qualité, format que vous choisissez, monogramme si vous le souhaitez) et fournie sur place — vos invités la consultent au bar, certains la gardent en souvenir. Trois itérations de carte sont incluses dans la prestation standard avant validation.",
    },
    {
      q: "Combien de temps avant l'événement faut-il réserver un barman privé ?",
      a: "Pour un barman privé Cosmo Club Paris, les délais varient selon la période de l'année et le format de votre soirée. Pour les périodes chargées (mai-juin, septembre-décembre, particulièrement les samedis soir et la période des fêtes de fin d'année), un délai de 4 à 6 semaines avant la date est confortable et permet de bien co-construire la carte avec vous. Pour les périodes plus calmes (janvier-mars, juillet-août en semaine), 2 à 3 semaines suffisent généralement. Pour les demandes très resserrées (moins d'une semaine), nous trouvons souvent une solution selon nos disponibilités — il est rare qu'on doive refuser un dîner intime à 8-10 invités à 5-7 jours, particulièrement en semaine. Si votre soirée est proche, contactez-nous quand même : nous vérifions immédiatement nos disponibilités et nous vous le disons franchement si la date est impossible, plutôt que de vous faire perdre du temps. Pour les très gros formats (50+ invités), prévoyez idéalement 6 à 8 semaines pour bien dimensionner l'équipe et la logistique.",
    },
    {
      q: "Quels formats de bar proposez-vous pour une prestation à domicile ?",
      a: "Cosmo Club Paris adapte le format de bar à la configuration de votre lieu, avec plusieurs options selon l'espace disponible. Pour un appartement parisien standard, nous travaillons soit avec un bar miroir compact de 1m60 de façade qui s'installe en moins de 30 minutes et se démonte aussi vite (idéal pour les soirées en semaine où on veut rendre l'espace ensuite), soit directement sur votre îlot de cuisine ou votre console si l'espace ne permet pas de monter un bar dédié — le mixologue travaille debout avec son matériel posé sur votre plan de travail, sans encombrement supplémentaire. Pour les terrasses, lofts et grands espaces, nous pouvons aller jusqu'à un bar miroir 6 baies (3m de façade, scénographie premium) ou un bar bois pour une ambiance plus chaleureuse. Tous les bars sont apportés et installés par l'équipe — vous n'avez rien à monter. Nous validons en amont les dimensions et l'accès (escalier, ascenseur, couloir) pour qu'il n'y ait aucune surprise le jour de la prestation.",
    },
    {
      q: "Êtes-vous assurés et déclarés pour intervenir en prestation privée ?",
      a: "Oui, Cosmo Club Paris dispose de toutes les attestations légales requises pour intervenir en prestation événementielle de débit de boissons, y compris dans un cadre privé à domicile : assurance responsabilité civile professionnelle (RC Pro) couvrant les dommages éventuels causés à votre lieu ou à vos invités, licence III pour le débit de boissons alcoolisées de moins de 18 degrés, déclaration ouverte en mairie et au préfet de Paris pour l'activité événementielle. Tous nos mixologues, baristas et commis de bar sont déclarés en bonne et due forme (URSSAF, contrats de travail), formés à la sécurité alimentaire HACCP, et formés au service responsable (gestion de l'alcoolisation, refus de servir si nécessaire, alternative non-alcoolisée systématiquement proposée). Pour les soirées dans un immeuble en copropriété ou dans une résidence avec règlement intérieur strict, nous fournissons les attestations sur simple demande, dans le délai que vous nous indiquez. Cette conformité est un standard de la profession — n'acceptez aucun prestataire à domicile qui ne peut pas vous fournir ces documents.",
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
  howToName:
    "Comment réserver un barman privé à Paris pour une soirée à domicile",
};

export default async function BarmanPrivePage() {
  const heroSrc = await getImagePath("barman-prive-paris", "hero", FALLBACK_HERO);
  return <LandingPage config={{ ...config, heroSrc }} />;
}
