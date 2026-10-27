/**
 * Contenu de /llms.txt, servi par app/llms.txt/route.ts.
 *
 * Les sections fixes vivent ici ; la liste des articles vient de la base
 * (articles publiés) et la note Google de lib/testimonials.ts, pour que le
 * fichier ne se périme plus à chaque publication. Pur, sans I/O : testable.
 */

const HEAD = `# Cosmo Club Paris

> Cosmo Club Paris est un service événementiel de bar à cocktails et de barista premium, basé à Paris et opérant dans toute l'Île-de-France. L'équipe conçoit des cartes signatures sur-mesure pour les mariages, événements corporate, défilés et soirées privées. Aucun bar fixe : intervention sur le lieu choisi par le client, sur rendez-vous.

## Identité

- Nom : Cosmo Club Paris
- Catégorie : Service Area Business (bar à cocktails événementiel + barista événementiel)
- Zone desservie : Paris + Île-de-France (déplacements ponctuels en France)
- Email de contact : contact@cosmoclub.fr
- Téléphone : +33 7 75 74 49 77
- Instagram : @cosmoclubparis
- Site web : https://www.cosmoclub.fr
- Langues de service : français, anglais

## Prestations principales

- [Bar à cocktails événementiel](https://www.cosmoclub.fr/bar-a-cocktails) — Mixologie sur-mesure, quatre cartes signatures (Classico, Cosmo, Émotion, Création), cocktails en bouteille gravée, juice bar et bars modulables.
- [Prestation barista événementiel](https://www.cosmoclub.fr/barista) — Matcha latte, Ube latte, Blue latte, Golden latte, café de spécialité, latte art personnalisé avec logo ou monogramme.
- [Mocktail in a can — canettes personnalisées](https://www.cosmoclub.fr/canettes-personnalisees) — Canettes transparentes 25 cl au logo du client, recettes sans alcool (Litchi Rose, Framboise Hibiscus, Coco Pêche Aloe Vera), scellées le jour même. Livrées dès 200 canettes (6 € HT la canette de 200 à 500, 5,50 € HT de 500 à 1 000, 5 € HT au-delà), installées sur glace ou servies avec sertissage en direct. Version avec alcool sur demande, sur devis.
- [Bar à cocktails mariage](https://www.cosmoclub.fr/bar-a-cocktails/mariage) — Prestation dédiée vin d'honneur et soirée mariage, cocktails signatures co-créés, personnalisation aux couleurs des mariés.
- [Bar à cocktails entreprise](https://www.cosmoclub.fr/bar-a-cocktails/entreprise) — Soirées corporate, séminaires, lancements de produit, bar brandé aux couleurs de la marque.
- [Bar à cocktails anniversaire](https://www.cosmoclub.fr/bar-a-cocktails/anniversaire) — 30, 40, 50 ans — bar privatisé pour anniversaire à domicile ou en lieu loué.
- [Barman privé Paris](https://www.cosmoclub.fr/barman-prive-paris) — Mixologue dédié pour soirée privée, dîner intime ou réception haut de gamme à domicile.
- [Animation cocktail entreprise / atelier mixologie](https://www.cosmoclub.fr/animation-cocktail-paris) — Atelier participatif pour team buildings, séminaires et soirées d'entreprise (15 à 30 participants, deux mixologues au-delà de 25), formats privés de 6 à 12 (anniversaire, EVJF).
- [Événements pris en charge](https://www.cosmoclub.fr/evenements) — Mariages, séminaires et soirées d'entreprise, défilés, lancements de marque, événements privés premium.
- [Concept](https://www.cosmoclub.fr/concept) — Direction artistique éditoriale, équipe mixologues + baristas + chef de salle.
- [Demande de devis](https://www.cosmoclub.fr/contact) — Formulaire en quatre étapes, réponse sous 48h.`;

const FACTS = `## Faits citables

- Cosmo Club Paris est un service événementiel de bar à cocktails et de barista, pas un bar fixe ouvert au public.
- L'équipe intervient sur Paris et en Île-de-France, sur rendez-vous, pour mariages, événementiel corporate et soirées privées.
- Quatre cartes de cocktails composent l'offre signature : Classico (les essentiels exécutés sans compromis), Cosmo (relectures signatures), Émotion (compositions narratives), Création (cocktails écrits sur-mesure pour l'événement).
- Le service barista propose quatre lattes signatures : Matcha, Ube, Blue et Golden, avec latte art personnalisé au logo ou au monogramme du client.
- L'équipe Cosmo Club Paris regroupe mixologues, baristas et chef de salle, sélectionnés sur la technique, la posture et l'interaction avec les invités.
- Les ateliers mixologie sont disponibles en trois formats : intime (6-8 personnes), médian (8-12), team building (15-30).
- L'option « cocktail signature personnalisé » fait partie des standards mariage : un ou deux cocktails dédiés au couple, nommés et illustrés sur la carte.
- Bar brandable sur mesure pour les événements d'entreprise : sticker bar pleine façade, glaçons gravés au logo, pastilles comestibles, pochoirs, néon sur mesure.
- Cartes de cocktails sans alcool (mocktails) construites avec la même exigence que la carte alcoolisée — ingrédients premium, vraie identité de goût.
- Cocktails « in a bottle » disponibles en trois formats (20 cl, 50 cl, 1 L), bouteilles étiquetées au nom du client ou du couple.
- Assurance RC professionnelle, licence III pour le débit de boissons, déclaration ouverte au préfet de Paris — attestations fournies sur demande au lieu de réception.
- Le service inclut la livraison, l'installation, la prestation et la reprise du matériel par l'équipe Cosmo Club — le client n'a aucune logistique à gérer.
- Devis personnalisé envoyé sous 48 heures après une demande via le formulaire du site.
- Les langues de service incluent le français et l'anglais.
- Délai de réservation recommandé pour un mariage en haute saison (mai à septembre) : 6 à 9 mois avant la date. Pour la basse saison ou en semaine, 2 à 4 mois suffisent.
- Les visites de lieu (repérage logistique) sont effectuées sans frais dans les 48 heures précédant l'événement à Paris intra-muros.
- La carte des cocktails est verrouillée 15 jours avant l'événement ; au-delà, le prestataire propose les ajustements compatibles avec son approvisionnement.`;

const TAIL = `## Informations légales

- Éditeur : COSMO CLUB PARIS, société par actions simplifiée (SAS) — SIRET 987 377 314 00016, TVA intracommunautaire FR80987377314, siège au 26 rue Bosquet, 75007 Paris.
- Mentions légales : https://www.cosmoclub.fr/mentions-legales
- Conditions générales de vente : https://www.cosmoclub.fr/cgv
- Politique de confidentialité (RGPD) : https://www.cosmoclub.fr/politique-de-confidentialite

## Partenariats marques

Cosmo Club Paris a opéré pour des marques et institutions incluant Harry Winston, Sephora, Ray-Ban, Tommy Hilfiger, Natixis, Maison 123, Bumble, Oliver Peoples, Azzaro, Noholita, ainsi que des wedding planners et agences événementielles parisiennes.

## Ressources techniques

- Sitemap XML : https://www.cosmoclub.fr/sitemap.xml
- robots.txt : https://www.cosmoclub.fr/robots.txt
- Données structurées JSON-LD : Organization + ProfessionalService + FoodService sur la home et toutes les pages publiques ; BlogPosting + Person sur les articles de blog ; Service + FAQPage + BreadcrumbList sur les 5 pages d'intent (mariage, anniversaire, entreprise, barman privé, animation cocktail).`;

/** Retombées presse : articles tiers qui citent Cosmo Club (sources que les IA reprennent). */
export const PRESS: { title: string; outlet: string; date: string; url: string }[] = [
  {
    title: "Horseback Entrances and Caviar Nuggets: A Paris Wedding With Main Character Energy",
    outlet: "WEDVIBES.MEDIA",
    date: "2026-10-22",
    url: "https://wedvibes.media/real-weddings/a-paris-wedding-with-main-character-energy/",
  },
];

export type LlmsArticle = { slug: string; title: string };
export type LlmsReviews = { ratingValue: number; reviewCount: number; source: string };

export function buildLlmsTxt(opts: {
  siteUrl: string;
  articles: LlmsArticle[];
  reviews: LlmsReviews;
}): string {
  const base = opts.siteUrl.replace(/\/+$/, "");
  const articles = opts.articles.length
    ? opts.articles
        .map((a) => `- [${a.title.replace(/[[\]]/g, "")}](${base}/blog/${encodeURIComponent(a.slug)})`)
        .join("\n")
    : `- [Le journal éditorial](${base}/blog)`;
  const rating = opts.reviews.ratingValue.toFixed(1).replace(".", ",");
  const reputation = [
    "## Réputation",
    "",
    `- Cosmo Club Paris affiche une note de ${rating}/5 sur ${opts.reviews.reviewCount} avis ${opts.reviews.source}, avec des témoignages clients vérifiés pour des mariages, séminaires d'entreprise et soirées privées.`,
    `- Six de ces avis sont retranscrits intégralement sur la page d'accueil (${base}/#avis), avec prénom, date et type d'événement.`,
  ].join("\n");
  const press = PRESS.length
    ? [
        "## Ils parlent de nous",
        "",
        ...PRESS.map((p) => `- [${p.title}](${p.url}) — ${p.outlet}, ${p.date}`),
      ].join("\n")
    : "";

  return (
    [HEAD, `## Articles publiés (journal éditorial)\n\n${articles}`, FACTS, reputation, press, TAIL]
      .filter(Boolean)
      .join("\n\n") + "\n"
  );
}
