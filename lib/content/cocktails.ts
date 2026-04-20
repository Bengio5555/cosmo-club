export type Carte = {
  id: "classico" | "cosmo" | "emotion" | "creation";
  num: string;
  kicker: string;
  name: string;
  tagline: string;
  description: string;
  signatures: string[];
  accent: "grenat" | "or" | "cream" | "bronze";
};

export const cartes: Carte[] = [
  {
    id: "classico",
    num: "I",
    kicker: "Les indétrônables",
    name: "Classico",
    tagline: "Des classiques, sans compromis.",
    description:
      "Les piliers du bar rejoués à la perfection — ratios justes, glace taillée, verrerie choisie. Le goût qu'on connaît, exécuté comme une signature.",
    signatures: [
      "Cosmopolitain",
      "Moscow Mule",
      "Margarita",
      "Mojito",
      "Old Fashioned",
      "Negroni",
    ],
    accent: "cream",
  },
  {
    id: "cosmo",
    num: "II",
    kicker: "Coups de cœur revisités",
    name: "Cosmo",
    tagline: "Des classiques, avec une idée derrière.",
    description:
      "Nos relectures préférées — ici un piment, là une infusion, un petit geste qui change tout. Ce qu'on sert aux amis quand on a envie de frimer, gentiment.",
    signatures: [
      "Pornstar Martini",
      "Spicy Margarita",
      "Amaretto Sour",
      "Espresso Martini",
      "Basilic Smash",
      "Paloma Chili",
    ],
    accent: "grenat",
  },
  {
    id: "emotion",
    num: "III",
    kicker: "Alcools & toppings premium",
    name: "Émotion",
    tagline: "Là où chaque détail compte double.",
    description:
      "Alcools de marque, produits frais de saison, givrages, paillettes d'or fin, glaçons gravés. Une carte pensée pour les soirées où l'on veut laisser une trace.",
    signatures: [
      "Dom Pérignon Spritz",
      "Hibiki Sour",
      "Caviar & Lemon Drop",
      "Or 24 carats Martini",
      "Champagne Caresse",
      "Truffle Negroni",
    ],
    accent: "or",
  },
  {
    id: "creation",
    num: "IV",
    kicker: "Sur-mesure intégral",
    name: "Création",
    tagline: "Votre cocktail, écrit pour vous.",
    description:
      "Un logo, une couleur, une anecdote, une chanson — on le transforme en verre. Brief, dégustation, ajustements. Vous repartez avec une recette signée, et portant votre nom.",
    signatures: [
      "Brief créatif avec le chef-mixologue",
      "Dégustation pré-événement",
      "Palette chromatique accordée",
      "Fiche recette remise après",
      "Nommage personnalisé",
      "Signature sur menu imprimé",
    ],
    accent: "bronze",
  },
];

export const shots = [
  {
    title: "Classico",
    tag: "Valeurs sûres",
    items: ["Tequila · Sel · Citron", "Jägerbomb", "Sambuca · Café", "B-52"],
  },
  {
    title: "Fruités",
    tag: "Pour la galerie",
    items: ["Passion · Vodka", "Mangue · Rhum", "Framboise · Gin", "Ananas · Tequila"],
  },
  {
    title: "À thème — Bar à Tequila",
    tag: "L'animation signature",
    items: [
      "Sélection 100% agave",
      "Dégustation guidée",
      "Sangrita maison",
      "Verrines à poser sur bras de serveur",
    ],
  },
];

export const bottles = [
  {
    format: "20 cl",
    label: "Moments",
    desc: "Le format cadeau. Une bouteille gravée par invité, à ramener chez soi en souvenir.",
    tag: "Dès 30 unités",
  },
  {
    format: "50 cl",
    label: "Tablée",
    desc: "Le format convivial. Se partage sur la table, se photographie, se commente.",
    tag: "Dès 12 unités",
  },
  {
    format: "1 L",
    label: "Rituel",
    desc: "Le format bar. Pour les longues soirées et le service en continu. Verre lourd, étiquette custom.",
    tag: "Dès 6 unités",
  },
];

export const alcoholFree = {
  juicebar: [
    "Pressages minute (orange, pomme-citron-gingembre, betterave-grenade)",
    "Shots d'élixirs (curcuma, matcha, pistache rose)",
    "Sirops maison (hibiscus, verveine, tonka)",
  ],
  mocktails: [
    "Seedlip Garden Tonic",
    "Palma Virgin",
    "Matcha Collins",
    "Fig & Rosemary Fizz",
    "Cold-brew Spritz",
  ],
};

export const bars = [
  {
    name: "Le Comptoir",
    tagline: "Épuré · 2,5 m",
    desc: "Bois brut, arête laiton. Pour les cocktails classiques et les dîners élégants.",
    capacity: "30–60 invités",
  },
  {
    name: "L'Îlot",
    tagline: "Central · 3 m",
    desc: "Accessible 360°. Pensé pour les cocktails dînatoires et les espaces ouverts.",
    capacity: "60–150 invités",
  },
  {
    name: "La Scène",
    tagline: "Signature · 4 m",
    desc: "Gradin, rétroéclairage, bar avant et bar arrière. Votre cocktail devient spectacle.",
    capacity: "120–300 invités",
  },
  {
    name: "Le Sur-mesure",
    tagline: "À concevoir",
    desc: "Vos plans, vos couleurs, vos matériaux. Conçu et fabriqué pour un unique événement.",
    capacity: "Sans limite",
  },
];
