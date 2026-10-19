/**
 * Offre « Mocktail in a can » — canettes personnalisées sans alcool.
 *
 * Source unique du contenu de /canettes-personnalisees : recettes,
 * formules et tarifs « à partir de », options, règles et FAQ. Les prix
 * sont HT ; le TTC affiché pour les particuliers est dérivé (TVA 20 %).
 *
 * Le devis reste obligatoire : aucune commande en ligne, aucun
 * simulateur. La version avec alcool n'est pas une formule standard,
 * elle se traite uniquement sur demande (mentionnée en FAQ).
 */

export const TVA_RATE = 0.2;

/** 5 → "5", 5.5 → "5,50", 1500 → "1 500" */
export function formatEur(n: number): string {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return n.toLocaleString("fr-FR", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

export function ttc(ht: number): number {
  return Math.round(ht * (1 + TVA_RATE) * 100) / 100;
}

export type Recette = {
  id: "litchi-rose" | "framboise-hibiscus" | "coco-peche-aloe";
  num: string;
  name: string;
  tasting: string;
  base: string;
  garnish: string;
  /** Garniture en deux mots, pour les lignes courtes (liste, légende). */
  garnishShort: string;
  /** Teinte dominante dans la canette (encre du logo choisie en conséquence). */
  hue: { primary: string; soft: string };
  /** Petite illustration botanique (PNG transparent, 512 px). */
  illustration: string;
  inkTone: "claire" | "foncée";
};

export const recettes: Recette[] = [
  {
    id: "litchi-rose",
    garnishShort: "Ruban de concombre",
    illustration: "/brand/canettes/illus-litchi-rose.png",
    num: "01",
    name: "Litchi Rose",
    tasting: "Floral, frais, pétillant.",
    base: "Purée de litchi, sirop de rose, citron jaune, tonic français.",
    garnish: "Ruban de concombre en biseau ou litchi entier.",
    hue: { primary: "#e9c9cf", soft: "#f6e6e8" },
    inkTone: "foncée",
  },
  {
    id: "framboise-hibiscus",
    garnishShort: "Fleur d’hibiscus",
    illustration: "/brand/canettes/illus-framboise-hibiscus.png",
    num: "02",
    name: "Framboise Hibiscus",
    tasting: "Acidulé, profond, légèrement épicé.",
    base: "Purée de framboise, sirop d'hibiscus, citron jaune, ginger beer.",
    garnish: "Fleur d'hibiscus.",
    hue: { primary: "#8f2a4a", soft: "#d9a2b4" },
    inkTone: "claire",
  },
  {
    id: "coco-peche-aloe",
    garnishShort: "Citron vert",
    illustration: "/brand/canettes/illus-coco-peche-aloe.png",
    num: "03",
    name: "Coco Pêche Aloe Vera",
    tasting: "Doux, désaltérant, solaire.",
    base: "Eau de coco, thé vert pêche, aloe vera, fleur de sureau, citron vert.",
    garnish: "Tranche de citron vert.",
    hue: { primary: "#e8dcb8", soft: "#f5efdc" },
    inkTone: "foncée",
  },
];

export type Formule = {
  id: "livree" | "installee" | "servie";
  num: string;
  name: string;
  tagline: string;
  desc: string;
  minCans: number;
  /** Prix d'appel affiché « à partir de ». */
  fromHt: number;
  fromUnit: "canette" | "forfait";
  /** Une seule ligne sous le prix : la condition du prix d'appel, rien d'autre. */
  priceNote?: string;
  includes: string[];
  forWho: string[];
  highlight?: "recommandé" | "signature";
};

export const formules: Formule[] = [
  {
    id: "livree",
    num: "01",
    name: "Livrée",
    tagline: "Les canettes, prêtes à offrir.",
    desc: "Préparées et scellées le jour même, livrées fraîches en bacs isothermes. Vous les distribuez, nous nous occupons du reste.",
    minCans: 200,
    fromHt: 6,
    fromUnit: "canette",
    priceNote: "5,50 € HT dès 500 canettes · 5 € HT dès 1 000",
    includes: [
      "Canette PET 25 cl, couvercle alu, garniture visible",
      "Logo en étiquette transparente",
      "Livrée fraîche en bacs isothermes, scellée le jour même",
    ],
    forWho: ["Boutiques", "Bureaux", "Cadeaux clients", "Kits presse"],
  },
  {
    id: "installee",
    num: "02",
    name: "Installée",
    tagline: "Présentées sur glace, sur place.",
    desc: "Les canettes dressées sur glace dans nos vasques, avec la carte des recettes imprimée à vos couleurs. Mise en place et reprise comprises.",
    minCans: 200,
    fromHt: 6,
    fromUnit: "canette",
    priceNote: "5,50 € HT dès 500 · 5 € HT dès 1 000 · + 180 € HT d'installation",
    includes: [
      "Tout le contenu de la formule Livrée",
      "Vasques et glace, carte des recettes assortie",
      "Mise en place avant les invités, reprise après",
    ],
    forWho: ["Pop-up", "Journées presse", "Vernissages", "Ouvertures de boutique"],
  },
  {
    id: "servie",
    num: "03",
    name: "Servie",
    tagline: "Scellées en direct, devant vos invités.",
    desc: "Un bar, nos barmen et la sertisseuse en scène : chaque canette est garnie, remplie et scellée sous les yeux de l'invité, puis remise à son nom.",
    minCans: 200,
    fromHt: 2200,
    fromUnit: "forfait",
    priceNote: "200 canettes, bar et barman compris",
    includes: [
      "Bar Cosmo Club et barman en tenue",
      "Sertissage en direct, devant les invités",
      "Canettes et barmen supplémentaires sur devis",
    ],
    forWho: ["Soirées de marque", "Lancements", "Défilés", "Mariages"],
    highlight: "signature",
  },
];

/** Grille dégressive de la canette (formules Livrée et Installée). */
export const paliers = [
  { range: "200 à 500 canettes", ht: 6 },
  { range: "500 à 1 000 canettes", ht: 5.5 },
  { range: "Plus de 1 000 canettes", ht: 5 },
];

export const options = [
  {
    name: "Recette créée sur mesure",
    desc: "Une quatrième recette pensée pour votre marque : couleur, goût, garniture.",
    price: "150 € HT",
  },
  {
    name: "Livraison",
    desc: "Paris 60 € · petite couronne 90 € · reste de l'Île-de-France 120 à 150 €. Offerte dès 500 canettes.",
    price: "offerte dès 500",
  },
];

export const personnalisation = [
  {
    title: "Votre logo sur la canette",
    desc: "Posé en étiquette transparente, il semble imprimé sur la boisson elle-même. Encre blanche sur les recettes foncées, encre foncée sur les recettes claires.",
    detail: "Visuel validé par e-mail avant production",
  },
  {
    title: "Des recettes à vos couleurs",
    desc: "Rose, grenat, doré : chaque recette existe dans une teinte. On choisit celles qui répondent à votre charte, ou on en crée une.",
    detail: "Recettes au catalogue, sur mesure en option",
  },
  {
    title: "La carte des recettes assortie",
    desc: "Imprimée dans le même visuel que vos canettes, posée sur la vasque ou glissée dans le colis.",
    detail: "Comprise dans la formule Installée",
  },
];

export const etapes = [
  {
    title: "Brief et devis",
    desc: "Nombre de canettes, formule, date, lieu. Devis sous 48 h.",
  },
  {
    title: "Visuel et validation",
    desc: "Nous posons votre logo sur la canette et vous envoyons le visuel. Rien ne part en production sans votre accord par e-mail.",
  },
  {
    title: "Impression des étiquettes",
    desc: "10 jours ouvrés entre la validation et la livraison. Express sous 7 jours, majoration de 25 %.",
  },
  {
    title: "Préparation le jour même",
    desc: "Remplissage, garniture et sertissage le matin de la livraison. À consommer dans la journée.",
  },
];

export const regles = [
  "200 canettes minimum · une recette dès 200, deux dès 300, trois dès 500",
  "Délai de 10 jours ouvrés, express sous 7 jours (+25 %)",
  "Acompte de 50 % à la commande, solde à la livraison",
  "Livraison à Paris et en Île-de-France, offerte dès 500 canettes",
  "Fraîcheur garantie le jour de la livraison, à consommer dans la journée",
];

export type FaqEntry = { q: string; a: string };

export const faq: FaqEntry[] = [
  {
    q: "Qu'est-ce qu'un « Mocktail in a can » ?",
    a: "Une canette transparente de 25 cl à couvercle aluminium, remplie d'une recette sans alcool créée par Cosmo Club, avec une garniture visible (ruban de concombre, fleur d'hibiscus, citron vert) et votre logo posé en étiquette transparente. Chaque canette est remplie et scellée le jour même de la livraison ou de l'événement.",
  },
  {
    q: "Combien coûte une canette personnalisée ?",
    a: "À partir de 6 € HT la canette de 200 à 500 canettes, 5,50 € HT de 500 à 1 000, 5 € HT au-delà de 1 000. La création du visuel est offerte. Les prix sont HT, TVA de 20 % en sus (soit 6 € à 7,20 € TTC la canette pour les particuliers). Le devis reste obligatoire.",
  },
  {
    q: "Quelle est la commande minimale ?",
    a: "200 canettes, quelle que soit la formule. En dessous, une production personnalisée ne tient pas : impression des étiquettes, préparation des recettes, remplissage et sertissage mobilisent une équipe quelle que soit la quantité. Le nombre de recettes dépend de la quantité : une recette dès 200 canettes, deux dès 300, trois dès 500.",
  },
  {
    q: "Quel est le délai de commande ?",
    a: "Comptez 10 jours ouvrés entre la validation du visuel et la livraison, le temps d'imprimer les étiquettes. Un délai express sous 7 jours est possible avec une majoration de 25 %. Le visuel est validé par e-mail avant toute production et un acompte de 50 % est demandé à la commande.",
  },
  {
    q: "Peut-on avoir une version avec alcool ?",
    a: "Oui, sur demande uniquement. La version cocktail avec alcool n'est pas une formule standard : elle est étudiée au cas par cas et fait l'objet d'un devis spécifique. Précisez-le dans votre demande.",
  },
  {
    q: "Quelles recettes sont disponibles ?",
    a: "Au catalogue aujourd’hui : Litchi Rose, Framboise Hibiscus et Coco Pêche Aloe Vera, trois recettes sans alcool, d’autres à venir. Des lattes glacés sont également possibles. Une recette sur mesure, créée pour votre marque, est proposée en option à 150 € HT.",
  },
  {
    q: "Où livrez-vous et combien de temps se conservent les canettes ?",
    a: "Livraison à Paris (60 € HT), en petite couronne (90 € HT) et dans le reste de l'Île-de-France (120 à 150 € HT), offerte dès 500 canettes. Les canettes sont préparées le matin même et livrées fraîches en bacs isothermes : elles sont à consommer dans la journée.",
  },
  {
    q: "Quelle est la différence entre les formules Livrée, Installée et Servie ?",
    a: "Livrée : les canettes seules, livrées fraîches, dès 200 canettes, de 6 à 5 € HT la canette selon la quantité. Installée : les canettes présentées sur glace dans nos vasques avec la carte des recettes, mise en place et reprise comprises, dès 200 canettes, même tarif à la canette plus un forfait installation de 180 € HT. Servie : un bar, un barman et le sertissage en direct devant les invités, à partir de 2 200 € HT pour 200 canettes.",
  },
];
