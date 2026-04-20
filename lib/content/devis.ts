import { z } from "zod";

export const eventTypes = [
  { id: "mariage", label: "Mariage", desc: "Cérémonie, vin d'honneur, dîner, soirée dansante." },
  { id: "corporate", label: "Corporate", desc: "Séminaire, lancement produit, cocktail client." },
  { id: "prive", label: "Soirée privée", desc: "Anniversaire, dîner en ville, rooftop, intime." },
  { id: "defile", label: "Défilé / Mode", desc: "Show, after, backstage, presse." },
  { id: "autre", label: "Autre", desc: "On vous écoute — décrivez dans le message." },
] as const;

export const offers = [
  {
    id: "bar",
    label: "Bar à cocktails",
    desc: "Classiques, signatures, shots, cocktails en bouteille.",
  },
  {
    id: "barista",
    label: "Barista",
    desc: "Matcha, Ube, Blue, Golden Latte — chauds ou glacés.",
  },
  {
    id: "both",
    label: "Les deux",
    desc: "Bar du soir + stand barista du matin ou dessert.",
  },
  {
    id: "undecided",
    label: "Je ne sais pas encore",
    desc: "Conseillez-moi selon mon événement.",
  },
] as const;

export const devisSchema = z.object({
  eventType: z.enum(["mariage", "corporate", "prive", "defile", "autre"], {
    message: "Choisissez un type d'événement.",
  }),
  offer: z.enum(["bar", "barista", "both", "undecided"], {
    message: "Choisissez une offre.",
  }),
  date: z
    .string()
    .min(4, "Indiquez une date ou période.")
    .max(80, "Trop long — simplifiez."),
  location: z
    .string()
    .min(2, "Ville ou lieu ?")
    .max(120, "Trop long."),
  guests: z.coerce
    .number({ message: "Un nombre." })
    .int()
    .min(1, "Au moins un invité.")
    .max(10000, "Impressionnant — contactez-nous directement."),
  firstName: z.string().min(1, "Votre prénom."),
  lastName: z.string().min(1, "Votre nom."),
  email: z.string().email("Email invalide."),
  phone: z
    .string()
    .min(6, "Téléphone trop court.")
    .max(30, "Téléphone trop long.")
    .regex(/^[0-9+().\s-]+$/, "Caractères invalides."),
  message: z
    .string()
    .max(1500, "Maximum 1500 caractères.")
    .optional()
    .or(z.literal("")),
  website: z.string().max(0).optional().or(z.literal("")),
});

export type DevisInput = z.infer<typeof devisSchema>;

export const stepFields = {
  1: ["eventType"] as const,
  2: ["offer"] as const,
  3: ["date", "location", "guests"] as const,
  4: ["firstName", "lastName", "email", "phone", "message"] as const,
};
