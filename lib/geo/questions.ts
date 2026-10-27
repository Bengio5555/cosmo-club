/**
 * Questions posées chaque semaine à un assistant IA avec recherche web,
 * pour savoir si Cosmo Club est cité. Formulées comme un vrai client, sans
 * le nom de la marque. La liste reste stable pour comparer d'une semaine
 * à l'autre : en changer une casse la tendance de sa catégorie.
 */
export type GeoQuestion = { category: GeoCategory; question: string };

export const GEO_CATEGORIES = {
  mariage: "Mariage",
  entreprise: "Entreprise",
  anniversaire: "Anniversaire",
  prive: "Soirée privée",
  atelier: "Atelier mixologie",
  barista: "Barista",
  canettes: "Canettes",
  prix: "Prix",
} as const;

export type GeoCategory = keyof typeof GEO_CATEGORIES;

export const GEO_QUESTIONS: GeoQuestion[] = [
  { category: "mariage", question: "Qui contacter pour un bar à cocktails à un mariage à Paris ?" },
  { category: "mariage", question: "Quels sont les meilleurs prestataires de bar à cocktails pour un mariage en Île-de-France ?" },
  { category: "mariage", question: "Je cherche un mixologue pour le vin d'honneur de mon mariage près de Paris. Qui me conseillez-vous ?" },
  { category: "mariage", question: "Idées de bar original pour un mariage chic à Paris, avec des prestataires à contacter" },
  { category: "entreprise", question: "Quel prestataire choisir pour un bar à cocktails lors d'une soirée d'entreprise à Paris ?" },
  { category: "entreprise", question: "Bar à cocktails aux couleurs de notre marque pour un lancement de produit à Paris : qui contacter ?" },
  { category: "entreprise", question: "Je cherche un service de bar événementiel pour un séminaire en Île-de-France. Des recommandations ?" },
  { category: "anniversaire", question: "Bar à cocktails pour un anniversaire de 40 ans à Paris : quels prestataires ?" },
  { category: "anniversaire", question: "Qui peut animer un bar à cocktails pour une fête d'anniversaire à domicile à Paris ?" },
  { category: "prive", question: "Comment trouver un barman privé pour une soirée à domicile à Paris ?" },
  { category: "prive", question: "Quels sont les meilleurs services de barman à domicile à Paris ?" },
  { category: "prive", question: "Mixologue pour un dîner privé haut de gamme à Paris : qui recommandez-vous ?" },
  { category: "atelier", question: "Où organiser un atelier cocktail pour un team building à Paris ?" },
  { category: "atelier", question: "Atelier mixologie pour un EVJF à Paris : quelles adresses ?" },
  { category: "atelier", question: "Animation cocktail pour une soirée d'entreprise à Paris : qui contacter ?" },
  { category: "barista", question: "Qui propose un barista pour un événement à Paris ?" },
  { category: "barista", question: "Bar à café avec matcha latte et latte art pour un salon ou un événement d'entreprise à Paris : quels prestataires ?" },
  { category: "barista", question: "Je cherche un coffee bar événementiel pour un mariage en Île-de-France. Des noms ?" },
  { category: "canettes", question: "Où faire faire des canettes de cocktail personnalisées avec notre logo pour un événement ?" },
  { category: "canettes", question: "Mocktails en canette personnalisée pour un événement d'entreprise en France : quels fournisseurs ?" },
  { category: "prix", question: "Combien coûte un bar à cocktails pour un mariage de 100 personnes à Paris ?" },
  { category: "prix", question: "Quel est le prix d'un barman pour une soirée privée à Paris ?" },
  { category: "prix", question: "Budget pour un bar à cocktails lors d'une soirée d'entreprise de 150 personnes à Paris ?" },
  { category: "prix", question: "Combien coûte un atelier mixologie team building à Paris par personne ?" },
];
