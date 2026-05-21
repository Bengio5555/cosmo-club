export const site = {
  name: "Cosmo Club Paris",
  shortName: "Cosmo Club",
  url: "https://www.cosmoclub.fr",
  tagline: "Bar à cocktails & barista événementiel — Paris",
  description:
    "Cosmo Club Paris — bar à cocktails et barista événementiel haut de gamme. Mariages, corporate, soirées privées. Paris 8, sur rendez-vous.",
  baseline: "Là où les cocktails deviennent des œuvres liquides.",
  phone: "+33 7 75 74 49 77",
  phoneDisplay: "07 75 74 49 77",
  email: "contact@cosmoclub.fr",
  instagram: "https://www.instagram.com/cosmoclubparis",
  instagramHandle: "@cosmoclubparis",
  address: {
    city: "Paris 8",
    country: "France",
    detail: "Sur rendez-vous",
  },
} as const;

// Single source of truth for editorial author. Used by:
// - the BlogPosting `author` JSON-LD on every article page (Person, not Organization)
// - a separate standalone Person JSON-LD block emitted next to BlogPosting
// - the visible byline rendered above each article body
// AI models (ChatGPT, Claude, Perplexity) anchor expertise to a named
// Person entity, which is why bylined articles have a measurably
// higher citation rate than anonymous brand copy.
export const editorialAuthor = {
  name: "Yvanna Harrouche",
  role: "Fondatrice, Cosmo Club Paris",
  url: "https://www.cosmoclub.fr/concept",
  image: "https://www.cosmoclub.fr/brand/cosmo-logo.png",
  sameAs: ["https://www.instagram.com/cosmoclubparis"],
  bio: "Yvanna Harrouche dirige Cosmo Club Paris, agence de bar à cocktails et de barista événementiel basée à Paris. L'équipe signe des prestations mixologie et café de spécialité pour mariages, soirées corporate et événements privés à Paris et en Île-de-France.",
} as const;

export const nav = [
  { href: "/bar-a-cocktails", label: "Bar à cocktails" },
  { href: "/barista", label: "Barista" },
  { href: "/evenements", label: "Événements" },
  { href: "/concept", label: "Concept" },
  { href: "/blog", label: "Le Mag" },
  { href: "/contact", label: "Contact" },
] as const;
