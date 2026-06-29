// Per-event additional charges that weigh on the margin: glassware
// rental, ice, and free-form supplements. Stored as a single JSONB blob
// on events.extra_costs. Pure module (no server-only import) so both the
// client editor and the server margin computation can share it.

export type Supplement = { description: string; amount: number };

export type EventExtraCosts = {
  /** Location de verrerie (€ HT). */
  verrerie: number;
  /** Glaçons (€ HT). */
  glacons: number;
  /** Free-form extra charges, each with a description and amount (€ HT). */
  supplements: Supplement[];
};

export function emptyExtraCosts(): EventExtraCosts {
  return { verrerie: 0, glacons: 0, supplements: [] };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/** Defensive parser — tolerates a missing/legacy column (undefined). */
export function parseExtraCosts(raw: unknown): EventExtraCosts {
  if (!raw || typeof raw !== "object") return emptyExtraCosts();
  const obj = raw as Record<string, unknown>;
  const supplements = Array.isArray(obj.supplements)
    ? (obj.supplements as Array<Record<string, unknown>>)
        .map((s) => ({
          description: String(s.description ?? "").trim(),
          amount: num(s.amount),
        }))
        .filter((s) => s.description || s.amount > 0)
    : [];
  return {
    verrerie: num(obj.verrerie),
    glacons: num(obj.glacons),
    supplements,
  };
}

/** Flatten to labelled lines for the margin breakdown (only > 0 entries). */
export function extraCostLines(
  c: EventExtraCosts,
): Array<{ label: string; amount: number }> {
  const lines: Array<{ label: string; amount: number }> = [];
  if (c.verrerie > 0) lines.push({ label: "Location verrerie", amount: c.verrerie });
  if (c.glacons > 0) lines.push({ label: "Glaçons", amount: c.glacons });
  for (const s of c.supplements) {
    if (s.amount > 0) {
      lines.push({ label: s.description || "Supplément", amount: s.amount });
    }
  }
  return lines;
}

export function extraCostTotal(c: EventExtraCosts): number {
  return (
    Math.round(
      (c.verrerie +
        c.glacons +
        c.supplements.reduce((s, x) => s + (x.amount > 0 ? x.amount : 0), 0)) *
        100,
    ) / 100
  );
}
