// Pure module (partagé serveur/client) : où se trouve un élément de
// matériel en ce moment, à partir de ses affectations aux événements.

export type EventLite = {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  end_date: string | null;
  status: "a_venir" | "en_cours" | "termine" | "annule";
};

export type AssignmentLite = {
  event_id: string;
  equipment_id: string;
  depart_at: string | null;
  retour_at: string | null;
};

export type WhereKind = "sorti" | "prevu" | "non_revenu" | "stock";

export type Whereabouts = {
  kind: WhereKind;
  event: EventLite | null;
  /** Horodatage du dernier geste (chargement ou retour) si pertinent. */
  at: string | null;
};

export const WHERE_LABEL: Record<WhereKind, string> = {
  sorti: "Sur le terrain",
  prevu: "Prévu",
  non_revenu: "Non revenu",
  stock: "Au stock",
};

/**
 * Règles, par priorité :
 *  1. chargé (depart_at) et pas revenu sur un événement en cours ou à venir → « sorti »
 *  2. chargé et pas revenu sur un événement terminé → « non revenu » (alerte)
 *  3. affecté à un événement en cours/à venir sans chargement → « prévu » (le plus proche)
 *  4. sinon → « au stock »
 */
export function whereaboutsOf(
  equipmentId: string,
  assignments: AssignmentLite[],
  eventsById: Map<string, EventLite>,
): Whereabouts {
  const mine = assignments
    .filter((a) => a.equipment_id === equipmentId)
    .map((a) => ({ a, ev: eventsById.get(a.event_id) }))
    .filter((x): x is { a: AssignmentLite; ev: EventLite } => !!x.ev && x.ev.status !== "annule");

  const out = mine.filter((x) => x.a.depart_at && !x.a.retour_at);
  const sorti = out.filter((x) => x.ev.status === "en_cours" || x.ev.status === "a_venir").sort(byDate);
  if (sorti[0]) return { kind: "sorti", event: sorti[0].ev, at: sorti[0].a.depart_at };

  const nonRevenu = out.filter((x) => x.ev.status === "termine").sort(byDateDesc);
  if (nonRevenu[0]) return { kind: "non_revenu", event: nonRevenu[0].ev, at: nonRevenu[0].a.depart_at };

  const prevu = mine.filter((x) => !x.a.depart_at && (x.ev.status === "en_cours" || x.ev.status === "a_venir")).sort(byDate);
  if (prevu[0]) return { kind: "prevu", event: prevu[0].ev, at: null };

  return { kind: "stock", event: null, at: null };
}

function byDate(x: { ev: EventLite }, y: { ev: EventLite }) {
  return x.ev.date.localeCompare(y.ev.date);
}
function byDateDesc(x: { ev: EventLite }, y: { ev: EventLite }) {
  return y.ev.date.localeCompare(x.ev.date);
}

export type EventEquipmentProgress = {
  event: EventLite;
  total: number;
  charges: number;
  revenus: number;
};

/** Avancement matériel des événements en cours ou à venir qui ont du matériel. */
export function progressByEvent(assignments: AssignmentLite[], eventsById: Map<string, EventLite>): EventEquipmentProgress[] {
  const acc = new Map<string, EventEquipmentProgress>();
  for (const a of assignments) {
    const ev = eventsById.get(a.event_id);
    if (!ev || (ev.status !== "en_cours" && ev.status !== "a_venir")) continue;
    const p = acc.get(ev.id) ?? { event: ev, total: 0, charges: 0, revenus: 0 };
    p.total += 1;
    if (a.depart_at) p.charges += 1;
    if (a.retour_at) p.revenus += 1;
    acc.set(ev.id, p);
  }
  return Array.from(acc.values()).sort((x, y) => {
    if (x.event.status !== y.event.status) return x.event.status === "en_cours" ? -1 : 1;
    return x.event.date.localeCompare(y.event.date);
  });
}
