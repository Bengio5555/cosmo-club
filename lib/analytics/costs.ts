// Module pur : « ce qui nous coûte ». Deux lectures : les coûts portés par
// les événements (boissons, staff, frais) et les sorties bancaires par
// fournisseur, avec repérage des charges récurrentes.

export type NamedCost = { key: string; label: string; amount: number; count: number; hint?: string };

/** Regroupe et trie des coûts nommés (produit, personne, libellé). */
export function sumBy<T>(rows: T[], key: (r: T) => string, label: (r: T) => string, amount: (r: T) => number, hint?: (acc: T[]) => string): NamedCost[] {
  const acc = new Map<string, { label: string; amount: number; rows: T[] }>();
  for (const r of rows) {
    const k = key(r);
    const g = acc.get(k) ?? { label: label(r), amount: 0, rows: [] };
    g.amount += amount(r);
    g.rows.push(r);
    acc.set(k, g);
  }
  return Array.from(acc.entries())
    .map(([key, g]) => ({ key, label: g.label, amount: Math.round(g.amount * 100) / 100, count: g.rows.length, hint: hint ? hint(g.rows) : undefined }))
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

/* ─── Banque ─────────────────────────────────────────────────────── */

export type DebitLite = { amount: number; label: string | null; operation_type: string | null; settled_at: string | null };

export type Merchant = {
  key: string;
  label: string;
  total: number;
  count: number;
  months: number;
  /** Moyenne par mois couvert par la période. */
  perMonth: number;
  /** Présent chaque mois (ou presque) avec un montant stable : charge fixe. */
  recurring: boolean;
  operation: string | null;
};

const MERCHANT_STOP = new Set(["sas", "sarl", "sa", "eurl", "sepa", "vir", "prlv", "cb", "carte", "paiement", "fr", "paris"]);

/** Clé fournisseur : deux premiers mots significatifs du libellé. */
export function merchantKey(label: string | null | undefined, fallback: string): string {
  const words = (label ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !MERCHANT_STOP.has(w) && !/^\d+$/.test(w));
  return words.slice(0, 2).join(" ") || fallback;
}

export function groupDebits(debits: DebitLite[], monthsCovered: number): Merchant[] {
  const acc = new Map<string, { label: string; total: number; count: number; months: Map<string, number>; op: string | null }>();
  for (const d of debits) {
    const key = merchantKey(d.label, d.operation_type ?? "autre");
    const g = acc.get(key) ?? { label: d.label?.trim() || d.operation_type || "Autre", total: 0, count: 0, months: new Map(), op: d.operation_type };
    g.total += Number(d.amount);
    g.count += 1;
    const m = (d.settled_at ?? "").slice(0, 7);
    if (m) g.months.set(m, (g.months.get(m) ?? 0) + Number(d.amount));
    acc.set(key, g);
  }
  const span = Math.max(1, monthsCovered);
  return Array.from(acc.entries())
    .map(([key, g]) => {
      const monthly = Array.from(g.months.values());
      const mean = monthly.length ? monthly.reduce((s, v) => s + v, 0) / monthly.length : 0;
      const spread = monthly.length > 1 ? Math.max(...monthly) - Math.min(...monthly) : 0;
      // Fixe : vu sur au moins 3 mois, ou sur tous les mois de la période
      // quand elle est courte, et des mensualités qui bougent de moins de 25 %.
      const recurring = g.months.size >= Math.min(3, Math.floor(span)) && g.months.size >= 2 && (mean === 0 || spread / mean <= 0.25);
      return {
        key,
        label: g.label,
        total: Math.round(g.total * 100) / 100,
        count: g.count,
        months: g.months.size,
        // Charge fixe : la mensualité moyenne ; sinon le total lissé sur la période.
        perMonth: Math.round((recurring ? mean : g.total / span) * 100) / 100,
        recurring,
        operation: g.op,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Nombre de mois (fractionnaire) couverts entre deux dates ISO. */
export function monthsBetween(fromISO: string, toISO: string): number {
  const ms = new Date(toISO).getTime() - new Date(fromISO).getTime();
  return Math.max(0.5, ms / (30.44 * 86_400_000));
}
