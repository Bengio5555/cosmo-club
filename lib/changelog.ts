/**
 * Journal des mises à jour du site et du dashboard, affiché dans
 * Paramètres → Mises à jour.
 *
 * Règle : à chaque mise en ligne d'une fonctionnalité, d'une amélioration
 * ou d'une correction visible, ajouter une entrée EN TÊTE de la liste.
 * Écrire pour l'équipe, pas pour un développeur : ce que ça change au
 * quotidien, en une phrase. Les retouches invisibles (refactor, typage)
 * n'ont pas leur place ici.
 */

export type ChangeKind = "nouveau" | "amelioration" | "correction";

export const CHANGE_AREAS = [
  "Site public",
  "Demandes",
  "Devis",
  "Factures",
  "Événements",
  "Stock & matériel",
  "Avis & visibilité",
  "Tableau de bord",
  "Sécurité",
] as const;
export type ChangeArea = (typeof CHANGE_AREAS)[number];

export type ChangeEntry = {
  /** Date de mise en ligne, AAAA-MM-JJ. */
  date: string;
  kind: ChangeKind;
  area: ChangeArea;
  title: string;
  detail?: string;
};

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  nouveau: "Nouveau",
  amelioration: "Amélioration",
  correction: "Correction",
};

export const CHANGELOG: ChangeEntry[] = [
  {
    date: "2026-11-10",
    kind: "nouveau",
    area: "Tableau de bord",
    title: "Page Analyse : rentabilité, ventes, types d'événements",
    detail:
      "Nouvel onglet Analyse (propriétaire, admin, compta). Rentabilité par événement avec CA net de commission, coût boissons, staff, frais, marge en euros et en pourcentage, base réelle ou estimée, et ce qui manque pour une marge fiable. Ce qui se vend d'après les devis acceptés : classement des prestations par CA et taux de présence, part par famille, cocktails les plus commandés. Lecture par type d'événement : panier moyen, CA par invité, marge, taux d'acceptation des devis. Bloc « Ce qui nous coûte » : staff par personne, boissons par famille et par produit, frais annexes, et sorties du compte Qonto par fournisseur avec repérage des charges fixes. Les marges ne sont calculées qu'à partir du 29 août 2026, début du suivi des sorties de stock. Période au choix et seuil d'alerte de marge.",
  },
  {
    date: "2026-11-10",
    kind: "amelioration",
    area: "Stock & matériel",
    title: "Matériel : où est chaque élément en ce moment",
    detail:
      "Sur la page Matériel, chaque élément indique s'il est au stock, prévu sur un événement, sur le terrain (chargé, pas encore revenu) ou non revenu d'un événement terminé, avec le nom de l'événement et l'heure du chargement. Un bloc en haut suit l'avancement des scans pour les événements en cours et à venir, et des filtres permettent de ne voir que ce qui est sorti ou manquant.",
  },
  {
    date: "2026-11-09",
    kind: "nouveau",
    area: "Factures",
    title: "Onglet Banque : compte Qonto et rapprochement des virements",
    detail:
      "Solde et mouvements du compte Qonto en lecture seule. Les virements reçus sont rapprochés des factures : automatiquement quand le numéro de facture et le montant concordent, sinon en un clic à partir de suggestions (montant, nom du client, date). L'encaissement se crée sur la facture et la solde si tout est réglé. Réservé aux rôles propriétaire, admin et compta.",
  },
  // ── Novembre 2026 ────────────────────────────────────────────
  {
    date: "2026-11-05",
    kind: "amelioration",
    area: "Stock & matériel",
    title: "Étiquettes QR téléchargeables une par une, à la taille choisie",
    detail:
      "Sur la page des étiquettes, choisis la largeur imprimée (3, 5, 7, 10 cm ou une valeur libre) et télécharge l'image de chaque étiquette. Le bouton Imprimer est retiré.",
  },
  {
    date: "2026-11-05",
    kind: "nouveau",
    area: "Demandes",
    title: "Picto d'accusé de réception sur chaque demande",
    detail:
      "Une enveloppe à côté de l'e-mail du prospect indique si le mail envoyé après le formulaire est arrivé : cochée verte (remis), grise (parti), barrée rouge (non remis, adresse à vérifier).",
  },
  {
    date: "2026-11-05",
    kind: "nouveau",
    area: "Devis",
    title: "E-mail d'alerte quand un client refuse un devis",
    detail:
      "Tu reçois un e-mail « Devis refusé » avec le montant, les coordonnées du client et un lien vers le devis. Avant, un refus ne se voyait qu'en ouvrant la liste des devis.",
  },
  {
    date: "2026-11-05",
    kind: "nouveau",
    area: "Devis",
    title: "Motif de refus demandé au client",
    detail:
      "Au refus, le client peut indiquer pourquoi (budget, date annulée, autre prestataire, autre) et laisser un mot. Le motif arrive dans l'e-mail et s'affiche sur le devis.",
  },
  {
    date: "2026-11-05",
    kind: "nouveau",
    area: "Tableau de bord",
    title: "Onglet « Mises à jour » dans Paramètres",
    detail: "La liste datée de tout ce qui a été ajouté, amélioré ou corrigé sur le site et le dashboard.",
  },
  {
    date: "2026-11-04",
    kind: "nouveau",
    area: "Site public",
    title: "Barre flottante « Demander un devis »",
    detail:
      "Une carte discrète en bas de l'écran propose un devis après la moitié de la page, 45 secondes de lecture ou la deuxième page visitée. Fermable d'un clic, absente de la page contact. Clics mesurés dans Google Analytics.",
  },
  {
    date: "2026-11-02",
    kind: "amelioration",
    area: "Avis & visibilité",
    title: "Bouton « Avis reçu » disponible avant toute demande",
    detail: "Un avis laissé spontanément se note en un clic : le client sort de la liste à solliciter.",
  },
  {
    date: "2026-11-02",
    kind: "nouveau",
    area: "Tableau de bord",
    title: "Connexion en lecture seule pour l'assistant Pally",
    detail:
      "L'assistant peut lire les chiffres (CA, devis, factures, demandes, événements, matériel) sans rien pouvoir modifier et sans accès aux coordonnées des clients.",
  },
  {
    date: "2026-11-02",
    kind: "correction",
    area: "Tableau de bord",
    title: "Un avoir est compté dans le mois de sa facture d'origine",
    detail: "Le CA du mois ne passe plus en négatif quand un avoir annule une facture d'un mois précédent.",
  },

  // ── Octobre 2026 ─────────────────────────────────────────────
  {
    date: "2026-10-27",
    kind: "nouveau",
    area: "Sécurité",
    title: "IBAN modifiable par le propriétaire seul, avec code par e-mail",
    detail: "Chaque changement de coordonnées bancaires est confirmé par un code et consigné dans un historique.",
  },
  {
    date: "2026-10-27",
    kind: "nouveau",
    area: "Avis & visibilité",
    title: "Page Avis clients : demande, relance unique, avis reçu",
    detail:
      "Après un événement, un e-mail invite le client à laisser un avis Google. Une seule relance 7 jours après, et un même client n'est sollicité qu'une fois sur 12 mois.",
  },
  {
    date: "2026-10-27",
    kind: "nouveau",
    area: "Avis & visibilité",
    title: "Page Visibilité IA et bloc « À faire cette semaine »",
    detail:
      "Suivi de la présence de Cosmo Club dans les réponses des assistants IA, avec des actions concrètes à mener. Le fichier llms.txt et les règles pour les robots IA sont générés automatiquement.",
  },
  {
    date: "2026-10-27",
    kind: "amelioration",
    area: "Demandes",
    title: "Le Book part en pièce jointe de l'accusé de réception",
    detail: "Chaque demande de devis reçoit la plaquette en PDF avec l'e-mail de confirmation.",
  },
  {
    date: "2026-10-27",
    kind: "correction",
    area: "Demandes",
    title: "Le remplissage automatique ne classe plus une demande en robot",
    detail: "Une demande suspecte est conservée et signalée au lieu d'être perdue.",
  },
  {
    date: "2026-10-20",
    kind: "amelioration",
    area: "Site public",
    title: "Image d'aperçu sur toutes les pages partagées",
    detail: "Un lien du site partagé sur WhatsApp, LinkedIn ou Instagram affiche une image, le nom du site et la bonne langue.",
  },
  {
    date: "2026-10-19",
    kind: "nouveau",
    area: "Stock & matériel",
    title: "QR codes du matériel et scan départ/retour",
    detail:
      "Un QR code par caisse ou élément, une sélection par événement, et un lien dans le brief pour que le manutentionnaire scanne au départ du stock puis au retour. Écran rouge si l'élément n'est pas le bon.",
  },
  {
    date: "2026-10-19",
    kind: "nouveau",
    area: "Site public",
    title: "Offre « Mocktail in a can » : canettes personnalisées",
    detail:
      "Nouvelle page avec recettes, formules et essai de sa marque sur la canette. L'offre est proposée dans le formulaire de devis et remonte jusqu'au dashboard.",
  },
  {
    date: "2026-10-19",
    kind: "amelioration",
    area: "Site public",
    title: "Nouvelle typographie des titres (Bricolage)",
  },
  {
    date: "2026-10-19",
    kind: "correction",
    area: "Demandes",
    title: "Formulaire de devis fiabilisé",
    detail:
      "Champs remplis automatiquement reconnus, touche Entrée qui n'envoie plus par erreur, nouvel essai avant d'afficher une erreur.",
  },
  {
    date: "2026-10-16",
    kind: "correction",
    area: "Tableau de bord",
    title: "Avoirs déduits du CA dès leur création, sans double déduction",
  },
  {
    date: "2026-10-15",
    kind: "nouveau",
    area: "Devis",
    title: "Suivi de remise des e-mails de devis",
    detail: "Une pastille indique si l'e-mail est arrivé, a été ouvert ou a échoué.",
  },
  {
    date: "2026-10-15",
    kind: "nouveau",
    area: "Tableau de bord",
    title: "Documents : le Drive partagé Cosmo Club dans le dashboard",
  },
  {
    date: "2026-10-14",
    kind: "nouveau",
    area: "Factures",
    title: "Facture complémentaire rattachée à un devis déjà facturé",
  },
  {
    date: "2026-10-13",
    kind: "amelioration",
    area: "Tableau de bord",
    title: "CA par année civile et par type d'événement",
    detail: "Total annuel, filtre par année et colonnes empilées par type d'événement sur 6 mois.",
  },
  {
    date: "2026-10-06",
    kind: "nouveau",
    area: "Stock & matériel",
    title: "Coût de revient matière des recettes",
    detail: "Affiché sur la liste des boissons et sur chaque fiche recette.",
  },

  // ── Septembre 2026 ───────────────────────────────────────────
  {
    date: "2026-09-29",
    kind: "nouveau",
    area: "Site public",
    title: "Parcours de demande de devis mesuré dans Google Analytics",
    detail: "Clics sur les boutons devis, étapes du formulaire et envois sont suivis.",
  },
  {
    date: "2026-09-24",
    kind: "nouveau",
    area: "Demandes",
    title: "Provenance des demandes",
    detail: "Chaque demande indique d'où vient le client : Google, publicité, Instagram, assistant IA, site référent.",
  },
  {
    date: "2026-09-24",
    kind: "amelioration",
    area: "Demandes",
    title: "Suppression d'une demande depuis sa fiche",
  },
  {
    date: "2026-09-22",
    kind: "amelioration",
    area: "Sécurité",
    title: "Le lien de connexion ne crée jamais de compte",
    detail: "Seules les personnes déjà invitées peuvent se connecter au dashboard.",
  },
  {
    date: "2026-09-15",
    kind: "amelioration",
    area: "Événements",
    title: "Modification exceptionnelle de l'équipe sur un événement clôturé",
  },
  {
    date: "2026-09-10",
    kind: "nouveau",
    area: "Devis",
    title: "Carte de cocktails envoyée au client pour qu'il choisisse",
  },
  {
    date: "2026-09-10",
    kind: "nouveau",
    area: "Événements",
    title: "Rattacher un devis à un événement existant",
  },
  {
    date: "2026-09-10",
    kind: "nouveau",
    area: "Factures",
    title: "Note facultative à l'envoi d'une facture",
  },
  {
    date: "2026-09-09",
    kind: "amelioration",
    area: "Événements",
    title: "Horaires et planning d'équipe repris du devis accepté",
    detail: "Le brief affiche aussi les « Stocks à prendre » réservés pour l'événement.",
  },
  {
    date: "2026-09-09",
    kind: "amelioration",
    area: "Tableau de bord",
    title: "Dashboard utilisable au téléphone",
    detail: "Toutes les sections accessibles depuis le menu mobile, lignes de devis et de facture modifiables au doigt.",
  },
  {
    date: "2026-09-01",
    kind: "amelioration",
    area: "Stock & matériel",
    title: "Réservations de stock et listes de courses fiabilisées",
    detail:
      "Alerte quand la carte de l'événement s'écarte des réservations, plus de bouteilles comptées deux fois, réservation effaçable en un clic.",
  },

  // ── Avant septembre 2026 : grandes étapes ────────────────────
  {
    date: "2026-07-25",
    kind: "amelioration",
    area: "Devis",
    title: "Liste des devis filtrable par statut et regroupée",
  },
  {
    date: "2026-07-17",
    kind: "nouveau",
    area: "Factures",
    title: "Facture rattachée à son devis d'origine",
  },
  {
    date: "2026-07-08",
    kind: "amelioration",
    area: "Tableau de bord",
    title: "CA attribué au mois de l'événement, pas à la date de facture",
  },
  {
    date: "2026-06-29",
    kind: "nouveau",
    area: "Événements",
    title: "Charges additionnelles (verrerie, glaçons, suppléments) dans la marge",
  },
  {
    date: "2026-06-09",
    kind: "nouveau",
    area: "Factures",
    title: "Facture libre sans devis, remise commerciale globale et par ligne",
  },
  {
    date: "2026-06-10",
    kind: "nouveau",
    area: "Site public",
    title: "Témoignages et avis Google sur la page d'accueil",
  },
  {
    date: "2026-05-27",
    kind: "nouveau",
    area: "Événements",
    title: "Brief opérationnel de l'équipe, partageable par WhatsApp",
  },
  {
    date: "2026-05-26",
    kind: "nouveau",
    area: "Devis",
    title: "Plaquette et e-mail de devis en anglais",
  },
  {
    date: "2026-05-22",
    kind: "amelioration",
    area: "Tableau de bord",
    title: "Thème clair et sombre, dashboard pensé pour le téléphone",
  },
  {
    date: "2026-05-20",
    kind: "nouveau",
    area: "Demandes",
    title: "Statut d'une demande synchronisé avec son devis",
    detail: "Devis signé : demande gagnée. Devis refusé : demande perdue.",
  },
  {
    date: "2026-05-19",
    kind: "nouveau",
    area: "Site public",
    title: "Pages dédiées par type d'événement pour le référencement",
  },
  {
    date: "2026-05-18",
    kind: "nouveau",
    area: "Tableau de bord",
    title: "Prestataires et partenaires réseau",
  },
  {
    date: "2026-05-15",
    kind: "nouveau",
    area: "Site public",
    title: "Le Mag : articles gérés depuis le dashboard",
  },
  {
    date: "2026-05-13",
    kind: "nouveau",
    area: "Sécurité",
    title: "Rôles et gestion de l'équipe",
    detail: "Chaque membre ne voit que les sections de son rôle.",
  },
  {
    date: "2026-05-11",
    kind: "nouveau",
    area: "Site public",
    title: "Bases du référencement : plan du site, données structurées, images d'aperçu",
  },
];
