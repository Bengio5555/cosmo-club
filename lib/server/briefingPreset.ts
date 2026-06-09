/**
 * Operational briefing primitives — shape + canonical preset of the
 * 10 schedule steps a Cosmo event always goes through. Lives in
 * lib/server because it's imported by both the editor server action
 * and the public print page.
 */

export type BriefingScheduleStep = {
  time: string; // "HH:MM" or "" when unscheduled
  label: string;
  /** Used for grouping / icons on the print view. Free-form so we can
   *  add new kinds without a migration. */
  kind:
    | "delivery_in"
    | "loading"
    | "setup"
    | "team_arrival"
    | "delivery_ice"
    | "meal"
    | "service_start"
    | "service_end"
    | "teardown"
    | "delivery_out"
    | "other";
  assignees: string[]; // free-form, e.g. ["Wassim", "Atef"]
  comment: string;
};

export type BriefingContact = {
  role: string; // "Livraison glaçons", "Verrerie Acaris"
  name: string;
  phone?: string;
  order_ref?: string; // commande number for verrerie
  notes?: string;
};

export type BriefingAttachment = {
  label: string;
  url: string; // Supabase Storage URL or external
};

export type BriefingData = {
  schedule: BriefingScheduleStep[];
  stocks_notes: string; // free-form
  external_contacts: BriefingContact[];
  dress_code: string;
  general_notes: string; // warnings, special instructions
  attachments: BriefingAttachment[];
};

export const BRIEFING_PRESET_SCHEDULE: BriefingScheduleStep[] = [
  {
    time: "",
    label: "Livraison verrerie Acaris",
    kind: "delivery_in",
    assignees: [],
    comment: "Numéro de commande Acaris : ",
  },
  {
    time: "",
    label: "Chargement matériel Cosmo",
    kind: "loading",
    assignees: [],
    comment:
      "Bar N° :\nBac à glaçons N° :\nAdresse atelier : 1 rue Galilée 94200 Ivry Sur Seine",
  },
  {
    time: "",
    label: "Livraison, montage & installation du bar",
    kind: "setup",
    assignees: [],
    comment:
      "Adresse événement :\nOù déposer alcool / matériel :\nType de bar à monter :\nAccès (ascenseur, étage, place de livraison) :",
  },
  {
    time: "",
    label: "Arrivée du personnel & mise en place du bar",
    kind: "team_arrival",
    assignees: [],
    comment:
      "Stock + recettes + dress code : voir les sections dédiées plus bas.",
  },
  {
    time: "",
    label: "Livraison glaçons",
    kind: "delivery_ice",
    assignees: [],
    comment:
      "Prestataire :\nContact livreur :\nContact sur place :\nNombre de sacs :",
  },
  {
    time: "",
    label: "Repas staff",
    kind: "meal",
    assignees: [],
    comment: "Géré par : ",
  },
  {
    time: "",
    label: "Arrivée des convives & début du service",
    kind: "service_start",
    assignees: [],
    comment: "",
  },
  {
    time: "",
    label: "Départ des convives & fin de service",
    kind: "service_end",
    assignees: [],
    comment: "",
  },
  {
    time: "",
    label: "Rangement & reprise matériel",
    kind: "teardown",
    assignees: [],
    comment:
      "Message de retour de stock clair, concis et détaillé.\n" +
      "Tous les éléments lavables (tee-shirts, torchons…) dans la poubelle propre.\n" +
      "Séparer les déchets à reprendre par Cosmo dans les racks à bouteilles ou sacs poubelles.",
  },
  {
    time: "",
    label: "Reprise verrerie Acaris",
    kind: "delivery_out",
    assignees: [],
    comment: "Numéro de commande Acaris : ",
  },
];

/** Fixed reference guide always shipped with the briefing. Rendered as
 *  a small annex at the bottom of the briefing (screen + print). Edit
 *  the constant here when the SOP evolves — no DB write needed.
 *  Bullets use "•" so they read cleanly inside the pre block. */
export const BRIEFING_MONTAGE_GUIDE = `
Afin que chaque prestation se déroule dans les meilleures conditions, merci de respecter les points suivants :

✨ Attitude & comportement
• Soyez souriants, accueillants et proactifs avec les invités.
• Adoptez une posture professionnelle en toutes circonstances.
• Évitez les téléphones portables derrière le bar, sauf nécessité liée à la prestation.

👔 Tenue & présentation
• Tenue propre et repassée.
• Cheveux attachés si nécessaire.
• Apparence soignée du début à la fin de la prestation.

🍸 Bar propre et bien tenu
• Le bar doit rester propre, organisé et élégant pendant toute la durée de l'événement.
• Débarrassez régulièrement les déchets, cartons et bouteilles vides afin qu'ils ne soient jamais visibles des invités.

📦 Rangement du matériel
• Toutes les caisses Cosmo sont numérotées et organisées par catégorie.
• Merci de remettre chaque élément exactement dans la caisse correspondante après utilisation.
• Prenez le temps de vérifier que tout est correctement rangé avant le départ.
• Veillez à ce que tout le matériel soit parfaitement sec avant son rangement en caisse.
• Pensez à placer du Sopalin dans les biberons, bouteilles verseuses et autres contenants afin d'absorber l'humidité résiduelle et d'éviter tout risque de moisissure.
• Cette consigne s'applique également aux bacs à glace, aux éléments du bar ainsi qu'à tout matériel susceptible de conserver de l'humidité.

📱 Communication & groupe WhatsApp
• Le groupe WhatsApp de chaque événement doit être utilisé pour toutes les informations importantes liées à la prestation en cours afin que l'ensemble des intervenants puisse suivre les échanges en temps réel.
• Nous privilégions les communications sur le groupe pour une meilleure réactivité et une meilleure coordination des équipes.

📞 Communication avec le manutentionnaire
• Si l'événement se termine plus tôt que prévu ou, au contraire, se prolonge, prévenez impérativement le manutentionnaire au minimum 1 heure à l'avance.
• Le manutentionnaire est toujours présent sur le groupe WhatsApp, mais privilégiez un appel téléphonique, car les messages ne sont pas toujours lus immédiatement.

🥂 Casse de verrerie
• Toute casse de verrerie Cosmo doit être signalée avec un décompte précis en fin de prestation.
• Concernant la verrerie ou le matériel mis à disposition par la société Acaris, merci de nous signaler également toute casse.

📸 Matériel laissé sur place
• Lorsque la reprise du matériel est prévue le lendemain (information indiquée sur le planning), prenez systématiquement des photos du matériel avant votre départ.
• Merci de photographier le matériel correctement rangé ainsi que son emplacement exact afin de faciliter la reprise le lendemain.
• Cela concerne notamment la verrerie, les bacs à glaçons, les bars, les caisses et tout autre matériel laissé sur place.

🎨 Personnalisations & éléments de décoration
• Toutes les personnalisations se trouvent dans la caisse déco.
• Cela comprend notamment les menus personnalisés, les stickers de bar, les pastilles comestibles et tout autre élément personnalisé prévu pour l'événement.
• Pensez à installer ces éléments dès la mise en place du bar.

🥤 Produits périssables
• Toutes les bouteilles de soda, jus, purées de fruits ou autres produits périssables doivent être soit reprises par vos soins, soit jetées en fin de prestation selon les consignes données.

✅ Avant de partir
• Vérifiez que le bar est propre.
• Vérifiez que le matériel est complet et rangé.
• Signalez toute anomalie, casse ou manque avant votre départ.
• En cas de doute, appelez-nous. Nous préférons recevoir trop d'informations que pas assez.

Merci à tous pour votre professionnalisme et votre implication. La qualité de nos prestations repose autant sur nos cocktails que sur l'image que nous donnons auprès de nos clients. 🍸✨

L'équipe Cosmo Club
`.trim();

/**
 * Default empty briefing payload — used both as the initial value when
 * the operator clicks "Préparer briefing staff" and as a defensive
 * fallback when the JSONB column hasn't been initialised yet.
 */
export function emptyBriefing(): BriefingData {
  return {
    schedule: BRIEFING_PRESET_SCHEDULE.map((s) => ({ ...s })),
    stocks_notes: "",
    external_contacts: [],
    dress_code: "Chemise noire, pantalon noir, chaussures noires.",
    general_notes: "",
    attachments: [],
  };
}

/**
 * Defensive parser — reads whatever JSON shape is on the row and
 * returns a fully-typed BriefingData with sane defaults. Use when
 * loading briefing_data before render or before patching.
 */
export function parseBriefing(raw: unknown): BriefingData {
  const empty = emptyBriefing();
  if (!raw || typeof raw !== "object") return empty;
  const obj = raw as Record<string, unknown>;

  const schedule = Array.isArray(obj.schedule)
    ? (obj.schedule as Array<Record<string, unknown>>).map((s): BriefingScheduleStep => ({
        time: String(s.time ?? ""),
        label: String(s.label ?? ""),
        kind: (typeof s.kind === "string" ? s.kind : "other") as BriefingScheduleStep["kind"],
        assignees: Array.isArray(s.assignees)
          ? s.assignees.filter((a): a is string => typeof a === "string")
          : [],
        comment: String(s.comment ?? ""),
      }))
    : empty.schedule;

  const external_contacts = Array.isArray(obj.external_contacts)
    ? (obj.external_contacts as Array<Record<string, unknown>>).map((c): BriefingContact => ({
        role: String(c.role ?? ""),
        name: String(c.name ?? ""),
        phone: typeof c.phone === "string" ? c.phone : undefined,
        order_ref: typeof c.order_ref === "string" ? c.order_ref : undefined,
        notes: typeof c.notes === "string" ? c.notes : undefined,
      }))
    : [];

  const attachments = Array.isArray(obj.attachments)
    ? (obj.attachments as Array<Record<string, unknown>>).map((a): BriefingAttachment => ({
        label: String(a.label ?? ""),
        url: String(a.url ?? ""),
      })).filter((a) => a.label && a.url)
    : [];

  return {
    schedule,
    stocks_notes: typeof obj.stocks_notes === "string" ? obj.stocks_notes : "",
    external_contacts,
    dress_code: typeof obj.dress_code === "string" ? obj.dress_code : empty.dress_code,
    general_notes: typeof obj.general_notes === "string" ? obj.general_notes : "",
    attachments,
  };
}
