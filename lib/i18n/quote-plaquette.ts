/**
 * Translation dictionary for the public quote plaquette + the
 * accompanying client email. Two locales: 'fr' (default, used for
 * every existing quote) and 'en' (opt-in via the toggle in the
 * dashboard editor).
 *
 * Not a full i18n: line items, intro and terms typed by the operator
 * stay as-is — they're business content, not chrome. Only labels the
 * operator never writes are translated here.
 *
 * The signed PDF and the CGV remain in French regardless of this
 * locale, by design: a French SAS with a French legal form should not
 * issue legally-binding documents in a non-French version.
 */
export type QuoteLocale = "fr" | "en";

export function normalizeLocale(value: string | null | undefined): QuoteLocale {
  return value === "en" ? "en" : "fr";
}

type Dict = {
  // Page chrome
  status: {
    brouillon: string;
    envoye: string;
    accepte: string;
    refuse: string;
    expire: string;
  };
  hero: {
    eyebrow: string;
    quoteNumber: (n: string) => string;
    issuedOn: (date: string) => string;
    validUntil: (date: string) => string;
    eventDate: (date: string) => string;
    guests: (n: number) => string;
    location: string;
  };
  nav: {
    intro: string;
    items: string;
    schedule: string;
    moodboard: string;
    totals: string;
    terms: string;
    sign: string;
  };
  sections: {
    introTitle: string;
    itemsTitle: string;
    scheduleTitle: string;
    moodboardTitle: string;
    totalsTitle: string;
    termsTitle: string;
  };
  table: {
    designation: string;
    qty: string;
    unitPrice: string;
    lineTotal: string;
    discount: string;
  };
  totals: {
    subtotal: string;
    discount: string;
    totalHt: string;
    tva: (rate: number) => string;
    totalTtc: string;
    deposit: (pct: number) => string;
  };
  termsCard: {
    validityTitle: string;
    validityBody: string;
    depositTitle: string;
    depositBody: (pct: number) => string;
    cancellationTitle: string;
    cancellationBody: string;
    changesTitle: string;
    changesBody: string;
    pricesTitle: string;
    pricesBody: string;
  };
  cta: {
    accept: string;
    refuse: string;
    contact: string;
    download: string;
  };
  // Acceptance modal
  modal: {
    title: string;
    intro: string;
    nameLabel: string;
    namePlaceholder: string;
    signatureLabel: string;
    signatureHint: string;
    clear: string;
    cgvCheckbox: string;
    cgvFrenchOnly: string | null;
    submit: string;
    cancel: string;
    submitting: string;
    error: string;
  };
  // States after submission
  states: {
    acceptedTitle: string;
    acceptedBody: string;
    refusedTitle: string;
    refusedBody: string;
    expiredTitle: string;
    expiredBody: string;
  };
  refuseModal: {
    title: string;
    intro: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    submit: string;
    cancel: string;
  };
  // Email
  email: {
    subject: (n: string) => string;
    greeting: (name: string) => string;
    body: (n: string) => string;
    cta: string;
    signoff: string;
    teamLine: string;
  };
};

const FR: Dict = {
  status: {
    brouillon: "Brouillon",
    envoye: "En attente de signature",
    accepte: "Signé",
    refuse: "Refusé",
    expire: "Expiré",
  },
  hero: {
    eyebrow: "Devis",
    quoteNumber: (n) => `Devis ${n}`,
    issuedOn: (d) => `Émis le ${d}`,
    validUntil: (d) => `Valable jusqu'au ${d}`,
    eventDate: (d) => `Date de l'événement : ${d}`,
    guests: (n) => `${n} invités`,
    location: "Lieu",
  },
  nav: {
    intro: "Intro",
    items: "Prestations",
    schedule: "Déroulé",
    moodboard: "Moodboard",
    totals: "Totaux",
    terms: "Conditions",
    sign: "Signer",
  },
  sections: {
    introTitle: "À propos de ce devis",
    itemsTitle: "Détail de la prestation",
    scheduleTitle: "Déroulé de la journée",
    moodboardTitle: "Moodboard",
    totalsTitle: "Récapitulatif",
    termsTitle: "Conditions",
  },
  table: {
    designation: "Désignation",
    qty: "Qté",
    unitPrice: "P.U. HT",
    lineTotal: "Total HT",
    discount: "Remise",
  },
  totals: {
    subtotal: "Sous-total HT",
    discount: "Remise commerciale",
    totalHt: "Total HT",
    tva: (r) => `TVA ${r}%`,
    totalTtc: "Total TTC",
    deposit: (p) => `Acompte ${p}% à la signature`,
  },
  termsCard: {
    validityTitle: "Validité",
    validityBody:
      "Cette proposition est valable 30 jours à compter de sa date d'émission.",
    depositTitle: "Acompte",
    depositBody: (p) =>
      `Un acompte de ${p}% est demandé à la signature. Le solde est dû avant l'événement.`,
    cancellationTitle: "Annulation",
    cancellationBody:
      "En cas d'annulation à moins de 20 jours de l'événement, l'acompte est conservé.",
    changesTitle: "Modifications",
    changesBody:
      "Les ajustements mineurs de carte ou de scénographie sont possibles jusqu'à J-10 sans surcoût.",
    pricesTitle: "Tarifs",
    pricesBody:
      "Les prix s'entendent hors taxes. Frais de déplacement Paris intra-muros inclus.",
  },
  cta: {
    accept: "Accepter et signer",
    refuse: "Refuser",
    contact: "Nous contacter",
    download: "Télécharger en PDF",
  },
  modal: {
    title: "Signature électronique",
    intro:
      "Renseignez votre nom et tracez votre signature ci-dessous pour valider votre accord.",
    nameLabel: "Nom complet",
    namePlaceholder: "Prénom Nom",
    signatureLabel: "Signature",
    signatureHint: "Tracez votre signature avec la souris ou le doigt.",
    clear: "Effacer",
    cgvCheckbox:
      "J'accepte les conditions générales de vente reproduites ci-dessus.",
    cgvFrenchOnly: null,
    submit: "Signer ce devis",
    cancel: "Annuler",
    submitting: "Envoi en cours…",
    error: "Une erreur est survenue. Réessayez ou contactez-nous.",
  },
  states: {
    acceptedTitle: "Devis signé",
    acceptedBody:
      "Merci ! Vous recevez un PDF récapitulatif par email. Nous revenons vers vous pour la suite.",
    refusedTitle: "Devis refusé",
    refusedBody:
      "Merci pour votre retour. N'hésitez pas à nous écrire si nous pouvons ajuster la proposition.",
    expiredTitle: "Devis expiré",
    expiredBody:
      "Ce devis n'est plus valable. Recontactez-nous pour une mise à jour.",
  },
  refuseModal: {
    title: "Refuser ce devis",
    intro:
      "Un mot sur les raisons ? Cela nous aide à mieux ajuster la proposition à votre besoin.",
    reasonLabel: "Motif (facultatif)",
    reasonPlaceholder: "Budget, date indisponible, format pas adapté…",
    submit: "Confirmer le refus",
    cancel: "Annuler",
  },
  email: {
    subject: (n) => `Votre devis Cosmo Club Paris — ${n}`,
    greeting: (name) => `Bonjour ${name},`,
    body: (n) =>
      `Votre devis ${n} est prêt. Vous pouvez le consulter, l'accepter ou nous écrire directement depuis le lien ci-dessous.`,
    cta: "Voir le devis",
    signoff: "À très vite,",
    teamLine: "L'équipe Cosmo Club Paris",
  },
};

const EN: Dict = {
  status: {
    brouillon: "Draft",
    envoye: "Awaiting signature",
    accepte: "Signed",
    refuse: "Declined",
    expire: "Expired",
  },
  hero: {
    eyebrow: "Quote",
    quoteNumber: (n) => `Quote ${n}`,
    issuedOn: (d) => `Issued on ${d}`,
    validUntil: (d) => `Valid until ${d}`,
    eventDate: (d) => `Event date: ${d}`,
    guests: (n) => `${n} guests`,
    location: "Venue",
  },
  nav: {
    intro: "Intro",
    items: "Services",
    schedule: "Schedule",
    moodboard: "Moodboard",
    totals: "Totals",
    terms: "Terms",
    sign: "Sign",
  },
  sections: {
    introTitle: "About this quote",
    itemsTitle: "Service breakdown",
    scheduleTitle: "Event schedule",
    moodboardTitle: "Moodboard",
    totalsTitle: "Summary",
    termsTitle: "Terms",
  },
  table: {
    designation: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    discount: "Discount",
  },
  totals: {
    subtotal: "Subtotal (excl. VAT)",
    discount: "Commercial discount",
    totalHt: "Total (excl. VAT)",
    tva: (r) => `VAT ${r}%`,
    totalTtc: "Total (incl. VAT)",
    deposit: (p) => `${p}% deposit on signature`,
  },
  termsCard: {
    validityTitle: "Validity",
    validityBody: "This proposal is valid for 30 days from the date of issue.",
    depositTitle: "Deposit",
    depositBody: (p) =>
      `A ${p}% deposit is required on signature. The balance is due before the event.`,
    cancellationTitle: "Cancellation",
    cancellationBody:
      "If cancelled within 20 days of the event, the deposit is non-refundable.",
    changesTitle: "Changes",
    changesBody:
      "Minor adjustments to the menu or set-up are possible up to 10 days before the event at no extra cost.",
    pricesTitle: "Pricing",
    pricesBody:
      "All prices exclude VAT. Travel within central Paris is included.",
  },
  cta: {
    accept: "Accept and sign",
    refuse: "Decline",
    contact: "Contact us",
    download: "Download PDF",
  },
  modal: {
    title: "Electronic signature",
    intro:
      "Enter your full name and draw your signature below to confirm your agreement.",
    nameLabel: "Full name",
    namePlaceholder: "First and last name",
    signatureLabel: "Signature",
    signatureHint: "Draw your signature with your mouse or finger.",
    clear: "Clear",
    cgvCheckbox:
      "I accept the general terms and conditions reproduced above.",
    cgvFrenchOnly:
      "Note: the legal terms of sale (CGV) are governed by French law and are provided in French only. Please contact us if you need an English overview before signing.",
    submit: "Sign this quote",
    cancel: "Cancel",
    submitting: "Submitting…",
    error: "Something went wrong. Please retry or contact us.",
  },
  states: {
    acceptedTitle: "Quote signed",
    acceptedBody:
      "Thank you. You will receive a signed PDF copy by email shortly. We'll be in touch about the next steps.",
    refusedTitle: "Quote declined",
    refusedBody:
      "Thank you for letting us know. Feel free to reach out if you'd like us to adjust the proposal.",
    expiredTitle: "Quote expired",
    expiredBody:
      "This quote is no longer valid. Please contact us for an updated version.",
  },
  refuseModal: {
    title: "Decline this quote",
    intro:
      "A quick word on why? It helps us tailor a better proposal to your needs.",
    reasonLabel: "Reason (optional)",
    reasonPlaceholder: "Budget, date unavailable, format not a fit…",
    submit: "Confirm decline",
    cancel: "Cancel",
  },
  email: {
    subject: (n) => `Your Cosmo Club Paris quote — ${n}`,
    greeting: (name) => `Hi ${name},`,
    body: (n) =>
      `Your quote ${n} is ready. You can review it, accept it or get in touch with us directly from the link below.`,
    cta: "View the quote",
    signoff: "Talk soon,",
    teamLine: "The Cosmo Club Paris team",
  },
};

export function t(locale: QuoteLocale): Dict {
  return locale === "en" ? EN : FR;
}
