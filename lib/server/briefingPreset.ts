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

/** Fixed reference guide always shipped with the briefing. Plain
 *  markdown-ish; rendered as a small annex at the bottom of the print
 *  view. Edit the constant here when the SOP evolves — no DB write
 *  needed. */
export const BRIEFING_MONTAGE_GUIDE = `
## Guide de montage — rappel rapide

**Bar Portabar 2 Bay**
- Monter pieds + panneaux en commençant par la droite du barman.
- Poser les bartops en commençant par la gauche du barman.
- Vérifier l'aplomb avec niveau avant fixation finale.

**Réception verrerie Acaris**
- Compter chaque caisse à l'arrivée, signer le bon Acaris uniquement après comptage.
- Photographier toute casse constatée à l'ouverture des caisses (ouverture du contradictoire).

**Stock tampon**
- Ne déclencher qu'avec accord explicite de Michael ou Yvanna par WhatsApp.
- Ne JAMAIS proposer le tampon à la cliente — il est "offert".

**Fin de service**
- Message retour de stock à Michael/Yvanna : produits restants, casse éventuelle, photos.
- Éléments lavables (tee-shirts, torchons…) dans la poubelle propre.
- Déchets à reprendre par Cosmo séparés des poubelles du lieu.
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
