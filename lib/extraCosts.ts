// Per-event additional charges that weigh on the margin: glassware
// rental, ice, and free-form supplements — each with its own optional
// description. Stored as a single JSONB blob on events.extra_costs. Pure
// module (no server-only import) so both the client editor and the
// server margin computation can share it.

export type CostLine = { description: string; amount: number };

export type EventExtraCosts = {
  /** Location de verrerie. */
  verrerie: CostLine;
  /** Glaçons. */
  glacons: CostLine;
  /** Free-form extra charges. */
  supplements: CostLine[];
};

export function emptyExtraCosts(): EventExtraCosts {
  return {
    verrerie: { description: "", amount: 0 },
    glacons: { description: "", amount: 0 },
    supplements: [],
  };
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

/** Tolerates a bare number (legacy shape) or a {description, amount} object. */
function parseLine(raw: unknown): CostLine {
  if (typeof raw === "number") return { description: "", amount: num(raw) };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return { description: String(o.description ?? "").trim(), amount: num(o.amount) };
  }
  return { description: "", amount: 0 };
}

/** Defensive parser — tolerates a missing/legacy column (undefined). */
export function parseExtraCosts(raw: unknown): EventExtraCosts {
  if (!raw || typeof raw !== "object") return emptyExtraCosts();
  const obj = raw as Record<string, unknown>;
  const supplements = Array.isArray(obj.supplements)
    ? (obj.supplements as unknown[])
        .map(parseLine)
        .filter((s) => s.description || s.amount > 0)
    : [];
  return {
    verrerie: parseLine(obj.verrerie),
    glacons: parseLine(obj.glacons),
    supplements,
  };
}

/** Flatten to labelled lines for the margin breakdown (only > 0 entries). */
export function extraCostLines(
  c: EventExtraCosts,
): Array<{ label: string; amount: number }> {
  const lines: Array<{ label: string; amount: number }> = [];
  const withDesc = (base: string, desc: string) =>
    desc ? `${base} — ${desc}` : base;
  if (c.verrerie.amount > 0)
    lines.push({
      label: withDesc("Location verrerie", c.verrerie.description),
      amount: c.verrerie.amount,
    });
  if (c.glacons.amount > 0)
    lines.push({
      label: withDesc("Glaçons", c.glacons.description),
      amount: c.glacons.amount,
    });
  for (const s of c.supplements) {
    if (s.amount > 0) {
      lines.push({ label: s.description || "Supplément", amount: s.amount });
    }
  }
  return lines;
}

export function extraCostTotal(c: EventExtraCosts): number {
  const sup = c.supplements.reduce((s, x) => s + (x.amount > 0 ? x.amount : 0), 0);
  return Math.round((c.verrerie.amount + c.glacons.amount + sup) * 100) / 100;
}
