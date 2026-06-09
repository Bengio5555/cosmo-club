/**
 * Default validation checklist seeded on every event's TO-DO drawer.
 *
 * Shape: sections → groups → items. A section without sub-headers in
 * the source doc is modeled as a single group with a null title. The
 * operator can tick items and append custom lines per group; the whole
 * structure is persisted as JSONB on `events.todo_data`, so editing is
 * just a blob rewrite (no per-row table).
 *
 * Item ids are stable, hand-authored keys (sX-gY-iZ) so a future tweak
 * to the template doesn't collide with a saved event's existing ids.
 * Custom lines added by the operator get random ids at creation time.
 */

export type EventTodoItem = { id: string; label: string; done: boolean };
export type EventTodoGroup = { title: string | null; items: EventTodoItem[] };
export type EventTodoSection = {
  id: string;
  title: string;
  groups: EventTodoGroup[];
};
export type EventTodoData = { sections: EventTodoSection[] };

const item = (id: string, label: string): EventTodoItem => ({
  id,
  label,
  done: false,
});

export const DEFAULT_EVENT_TODO: EventTodoData = {
  sections: [
    {
      id: "s1",
      title: "1. Validation client & administratif",
      groups: [
        {
          title: null,
          items: [
            item("s1-i1", "Valider le devis final et définitif avec le client"),
            item("s1-i2", "Créer le groupe WhatsApp événement"),
            item("s1-i3", "Confirmer les horaires clés de l’événement"),
            item("s1-i4", "Confirmer adresse de facturation"),
            item("s1-i5", "Émettre et envoyer la facture"),
            item(
              "s1-i6",
              "Confirmer les coordonnées du contact sur place le jour J",
            ),
          ],
        },
      ],
    },
    {
      id: "s2",
      title: "2. Menus, créa & personnalisation",
      groups: [
        {
          title: "Menus & supports",
          items: [
            item("s2-g1-i1", "Valider noms des recettes & thème menu"),
            item("s2-g1-i2", "Envoyer le design du menu pour validation"),
            item("s2-g1-i3", "Faire imprimer les menus"),
          ],
        },
        {
          title: "Personnalisation événement",
          items: [
            item("s2-g2-i1", "Commander les pastilles comestibles personnalisées"),
            item("s2-g2-i2", "Commander les glaçons personnalisés"),
            item("s2-g2-i3", "Imprimante à cocktails ?"),
          ],
        },
        {
          title: "Décoration",
          items: [
            item("s2-g3-i1", "Confirmer la décoration florale"),
            item("s2-g3-i2", "Confirmer les éléments déco autour du bar si besoin"),
          ],
        },
      ],
    },
    {
      id: "s3",
      title: "3. Matériel & logistique",
      groups: [
        {
          title: "Bar & matériel",
          items: [
            item("s3-g1-i1", "Bloquer Acaris"),
            item("s3-g1-i2", "Définir / reconfirmer la taille du bar"),
          ],
        },
        {
          title: "Livraisons & manutention",
          items: [
            item(
              "s3-g2-i1",
              "Reconfirmer les instructions de livraison + horaires de reprise / récupération",
            ),
            item("s3-g2-i2", "Bloquer les manutentionnaires"),
          ],
        },
        {
          title: "Consommables",
          items: [
            item("s3-g3-i1", "Commander les glaçons"),
            item("s3-g3-i2", "Prévoir les éléments spécifiques éventuels"),
          ],
        },
      ],
    },
    {
      id: "s4",
      title: "4. Staff & organisation",
      groups: [
        {
          title: "Équipe",
          items: [
            item("s4-g1-i1", "Bloquer les barmans"),
            item("s4-g1-i2", "Bloquer les runners"),
            item("s4-g1-i3", "Bloquer les manuts"),
          ],
        },
        {
          title: "Staff briefing",
          items: [
            item("s4-g2-i1", "Confirmer le dress code"),
            item("s4-g2-i2", "Confirmer le repas staff (précommandé si possible)"),
            item("s4-g2-i3", "Faire le planning staff"),
            item("s4-g2-i4", "Envoyer le planning au staff"),
          ],
        },
      ],
    },
    {
      id: "s5",
      title: "5. Stock & achats",
      groups: [
        {
          title: "Gestion stock",
          items: [
            item("s5-g1-i1", "Faire la liste d’achat Métro"),
            item("s5-g1-i2", "Vérifier le stock disponible"),
            item("s5-g1-i3", "Préparer le chariot événement"),
          ],
        },
      ],
    },
    {
      id: "s6",
      title: "6. Vérifications finales (J-2 / J-1)",
      groups: [
        {
          title: null,
          items: [item("s6-i1", "Check de tout le dossier")],
        },
      ],
    },
  ],
};

/** Total + done counts across the whole checklist. */
export function todoProgress(data: EventTodoData): {
  done: number;
  total: number;
} {
  let done = 0;
  let total = 0;
  for (const s of data.sections) {
    for (const g of s.groups) {
      for (const it of g.items) {
        total += 1;
        if (it.done) done += 1;
      }
    }
  }
  return { done, total };
}

/**
 * Defensive coercion of whatever sits in events.todo_data (could be
 * null for a fresh event, or a legacy/garbled blob). Falls back to the
 * default template when the payload isn't a well-formed checklist.
 */
export function coerceEventTodo(raw: unknown): EventTodoData {
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as EventTodoData).sections)
  ) {
    return raw as EventTodoData;
  }
  return DEFAULT_EVENT_TODO;
}
