export type Latte = {
  id: "matcha" | "ube" | "blue" | "golden";
  num: string;
  name: string;
  origin: string;
  hue: { primary: string; soft: string; foam: string };
  tasting: string;
  base: string;
  notes: string[];
};

export const lattes: Latte[] = [
  {
    id: "matcha",
    num: "01",
    name: "Matcha",
    origin: "Uji — Kyoto",
    hue: { primary: "#6f8f4f", soft: "#c7d39a", foam: "#f1ecd2" },
    tasting: "Végétal, umami, long en bouche.",
    base: "Matcha cérémonial grade ceremonial, fouetté au chasen.",
    notes: ["Beurre d'amande", "Herbe coupée", "Lait d'avoine vanillé"],
  },
  {
    id: "ube",
    num: "02",
    name: "Ube",
    origin: "Philippines",
    hue: { primary: "#6f4a8f", soft: "#c9a9e8", foam: "#ecd7f5" },
    tasting: "Rond, sucré, boisé comme un marron violet.",
    base: "Purée d'igname violet lissée, miel, sel de mer fin.",
    notes: ["Vanille de Madagascar", "Noisette torréfiée", "Coco rôtie"],
  },
  {
    id: "blue",
    num: "03",
    name: "Blue",
    origin: "Clitoria ternatea",
    hue: { primary: "#3a5aa8", soft: "#8fa8e8", foam: "#dfe5f3" },
    tasting: "Floral, léger, spectaculaire au versement.",
    base: "Infusion de fleur de papillon, citron tamisé, lait baratté.",
    notes: ["Pétale de violette", "Zeste de citron vert", "Menthe glacée"],
  },
  {
    id: "golden",
    num: "04",
    name: "Golden",
    origin: "Kerala — Inde",
    hue: { primary: "#b88a2a", soft: "#e8c870", foam: "#f3e3b5" },
    tasting: "Épicé, chaleureux, terreux comme un soir d'hiver.",
    base: "Curcuma frais râpé, poivre noir, gingembre, lait d'amande.",
    notes: ["Cardamome", "Miel de châtaignier", "Cannelle de Ceylan"],
  },
];

export const stands = [
  {
    tier: "Épuré",
    range: "Mini 1,8 m",
    desc: "Comptoir en bois teinté, machine expresso visible, carte manuscrite.",
    specs: ["1 barista", "3 lattes à la carte", "Gobelets blancs"],
  },
  {
    tier: "Signature",
    range: "Standard 2,5 m",
    desc: "Laiton brossé, étagère à sirops, matcha whisked live, stickers personnalisés.",
    specs: ["2 baristas", "4 lattes + cold brew", "Gobelets brandés"],
  },
  {
    tier: "Grand Cru",
    range: "Premium 3,5 m",
    desc: "Îlot sur-mesure, pressoir à jus live, vitrine pâtisseries, néon à votre nom.",
    specs: ["3 baristas", "Carte complète + hot & iced", "Service & merch"],
  },
];

export const identity = [
  {
    title: "Gobelets signés",
    desc: "Votre logo imprimé à froid sur carton kraft ou céramique compostable. Menu écrit à la main au dos.",
    detail: "Dès 100 unités · production 7 jours",
  },
  {
    title: "Latte art personnalisé",
    desc: "Pochoirs au cacao, motifs à la crème, lettrage dans la mousse. Votre marque flotte à la surface.",
    detail: "Initiales, motifs, logos bicolores",
  },
  {
    title: "Stands sur-mesure",
    desc: "Matériaux, couleurs, agencement, néon, typographie du menu — dessinés et fabriqués pour un unique événement.",
    detail: "Briefing, 3D, fabrication 4–6 semaines",
  },
];
