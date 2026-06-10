// Verbatim 5-star Google reviews for Cosmo Club Paris, transcribed from
// the public Google Business profile (search "Cosmo Club Paris Avis").
// Single source of truth: feeds both the visible <Testimonials> section
// and the AggregateRating + Review JSON-LD on the home page.
//
// RULES (do not break):
//   - Text must stay VERBATIM — these are real, verifiable reviews. Never
//     edit, embellish, or invent. If Google removes one, remove it here.
//   - `aggregate` must mirror the real Google figures exactly. The profile
//     currently shows 5,0 ★ over 15 reviews — all 15 are 5-star, so there
//     is no cherry-picking distortion in showing the aggregate.
//   - Names are reproduced as Google displays them publicly.
//   - datePublished is the "Visité en…" month Google shows (YYYY-MM-01),
//     omitted where Google only gave a relative "il y a N mois".

export const reviewsAggregate = {
  ratingValue: 5,
  reviewCount: 15,
  bestRating: 5,
  source: "Google",
  profileUrl:
    "https://www.google.com/search?q=Cosmo+Club+Paris+Avis",
} as const;

export type Testimonial = {
  author: string;
  rating: 5;
  /** YYYY-MM-DD, when known from Google's "Visité en…" line. */
  date?: string;
  /** Short human-readable date shown in the UI. */
  dateLabel: string;
  body: string;
  /** Optional one-word context chip (event type) for the UI. */
  context?: string;
};

export const testimonials: Testimonial[] = [
  {
    author: "Claire M.",
    rating: 5,
    date: "2025-08-01",
    dateLabel: "Août 2025",
    context: "Mariage & corporate",
    body: "Merci à Yvanna et Mika pour cette expérience incroyable. Nous avons fait appel à ce bar pour notre événement et tout était parfait : les cocktails étaient excellents, le service très professionnel et l'équipe d'une grande gentillesse. Je recommande à 100 % pour tout type de soirée corporate ou mariage.",
  },
  {
    author: "Maître Gaspard",
    rating: 5,
    dateLabel: "Il y a 9 mois",
    context: "Séminaire d'entreprise",
    body: "Merci infiniment pour cette prestation remarquable ! Vos cocktails étaient tout simplement exceptionnels et ont enchanté tous nos collaborateurs. Votre professionnalisme et votre créativité ont largement contribué au succès de notre séminaire d'entreprise. Je ne manquerai pas de vous recommander chaleureusement et de faire à nouveau appel à vos talents pour nos prochains événements professionnels. Encore bravo pour ce moment magique !",
  },
  {
    author: "Valentine",
    rating: 5,
    date: "2025-10-01",
    dateLabel: "Octobre 2025",
    context: "Mariages & anniversaires",
    body: "J'ai participé à plusieurs évènements privés où j'ai pu découvrir Cosmo (mariages et anniversaires). Les cocktails sont délicieux, l'équipe est adorable et le plus : le joli bar miroir devant lequel nous avons pu nous photographier. Je continuerai de vous recommander auprès de mon entourage ! Belle continuation :)",
  },
  {
    author: "Ruben A.",
    rating: 5,
    date: "2025-07-01",
    dateLabel: "Juillet 2025",
    context: "Événement privé",
    body: "Je recommande à 100 % ! Une organisation fluide, une excellente communication et une très bonne ambiance le jour J. L'équipe est très pro et très réactive. Le bar en miroir est juste sublime.",
  },
  {
    author: "Chantal O.",
    rating: 5,
    date: "2025-05-01",
    dateLabel: "Mai 2025",
    context: "Mariage",
    body: "Cocktails excellents ! Un mariage de saveurs original qui nous transporte directement au soleil au coin de la plage en été. Prestation parfaite, service impeccable. Nous referons appel à vos services ! Un grand merci.",
  },
  {
    author: "Samuel Nguyen",
    rating: 5,
    date: "2025-08-01",
    dateLabel: "Août 2025",
    context: "Séminaire",
    body: "Super séminaire avec votre participation. Merci de nous avoir supportés à la fin quand nous vous redemandions encore et encore des cocktails alors que le bar était en train de fermer. Mille mercis.",
  },
];
