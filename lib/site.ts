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

export const nav = [
  { href: "/bar-a-cocktails", label: "Bar à cocktails" },
  { href: "/barista", label: "Barista" },
  { href: "/evenements", label: "Événements" },
  { href: "/concept", label: "Concept" },
  { href: "/blog", label: "Le Mag" },
  { href: "/contact", label: "Contact" },
] as const;
