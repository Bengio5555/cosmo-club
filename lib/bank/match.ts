/**
 * Rapprochement bancaire : module pur (sans import serveur) pour être
 * testable. Il note la ressemblance entre un virement entrant et une
 * facture ouverte, et décide si le lien peut se faire tout seul.
 */

export type OpenInvoice = {
  id: string;
  number: string;
  total_ttc: number;
  remaining: number; // reste à encaisser (TTC − encaissements déjà saisis)
  issue_date: string; // YYYY-MM-DD
  due_date: string | null;
  client_name: string | null; // "Société" ou "Prénom Nom"
  client_tokens: string[]; // mots significatifs du client, déjà normalisés
};

export type IncomingTx = {
  amount: number;
  label: string | null;
  reference: string | null;
  note: string | null;
  settled_at: string | null;
  emitted_at: string | null;
};

export type MatchReason = "numero" | "montant_exact" | "montant_total" | "acompte" | "client" | "date";

export type Candidate = {
  invoice: OpenInvoice;
  score: number;
  reasons: MatchReason[];
};

/** Seuil à partir duquel on propose la facture dans la liste. */
export const SUGGEST_MIN_SCORE = 35;
/** Seuil du rapprochement automatique (numéro + montant). */
export const AUTO_MIN_SCORE = 90;

const STOP_WORDS = new Set([
  "sas", "sarl", "sa", "sasu", "eurl", "sci", "et", "de", "des", "du", "la", "le", "les", "the", "and",
  "virement", "vir", "sepa", "paiement", "facture", "fact", "inst", "instantane", "ref", "mr", "mme", "m",
]);

/** Minuscules, sans accents, ponctuation → espaces. */
export function normalizeText(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Mots utiles d'un nom de client : ≥ 3 lettres, hors mots vides. */
export function clientTokens(name: string | null | undefined): string[] {
  return normalizeText(name)
    .split(" ")
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

/**
 * Le numéro de facture apparaît-il dans le texte ? "F-2026-0012" est
 * reconnu écrit "F20260012", "f 2026 0012", "2026-0012" (sans préfixe), etc.
 */
export function mentionsNumber(text: string, number: string): boolean {
  const t = normalizeText(text).replace(/ /g, "");
  if (!t) return false;
  const full = normalizeText(number).replace(/ /g, "");
  if (full.length >= 4 && t.includes(full)) return true;
  // Sans le préfixe alphabétique (F, FA, AV…), mais seulement si la partie
  // numérique est assez longue pour ne pas matcher n'importe quoi.
  const digitsOnly = full.replace(/^[a-z]+/, "");
  return digitsOnly.length >= 6 && t.includes(digitsOnly);
}

function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.015;
}

function daysBetween(a: string, b: string): number {
  return (new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;
}

export function scoreCandidate(tx: IncomingTx, inv: OpenInvoice): Candidate {
  const text = [tx.label, tx.reference, tx.note].filter(Boolean).join(" ");
  const reasons: MatchReason[] = [];
  let score = 0;

  if (mentionsNumber(text, inv.number)) {
    score += 60;
    reasons.push("numero");
  }

  if (sameAmount(tx.amount, inv.remaining)) {
    score += 30;
    reasons.push("montant_exact");
  } else if (sameAmount(tx.amount, inv.total_ttc)) {
    score += 22;
    reasons.push("montant_total");
  } else if (tx.amount > 0 && tx.amount < inv.remaining) {
    score += 6;
    reasons.push("acompte");
  }

  if (inv.client_tokens.length) {
    const words = new Set(normalizeText(text).split(" "));
    const hits = inv.client_tokens.filter((tok) => words.has(tok)).length;
    if (hits > 0) {
      score += Math.min(25, 12 + hits * 7);
      reasons.push("client");
    }
  }

  const when = tx.settled_at ?? tx.emitted_at;
  if (when) {
    const d = daysBetween(when, inv.issue_date);
    if (d < -3) {
      score -= 25; // payé avant l'émission : peu probable
    } else if (d <= 90) {
      score += 5;
      reasons.push("date");
    }
  }

  return { invoice: inv, score, reasons };
}

/** Candidats triés, au-dessus du seuil de suggestion. */
export function rankCandidates(tx: IncomingTx, invoices: OpenInvoice[]): Candidate[] {
  return invoices
    .filter((inv) => inv.remaining > 0.009)
    .map((inv) => scoreCandidate(tx, inv))
    .filter((c) => c.score >= SUGGEST_MIN_SCORE)
    .sort((a, b) => b.score - a.score);
}

/**
 * Rapprochement automatique. Par défaut un seul cas, le plus sûr : numéro
 * de facture dans le libellé ET montant égal au reste dû, sans ex æquo.
 * L'option `amountAndClient` accepte aussi « montant exact + nom du client,
 * candidat unique » ; elle est désactivée pour l'instant (décision du
 * 2026-11-09 : ces cas restent des suggestions à valider).
 */
export function pickAutoMatch(
  candidates: Candidate[],
  opts: { amountAndClient?: boolean } = {},
): Candidate | null {
  const [best, second] = candidates;
  if (!best) return null;
  const has = (r: MatchReason) => best.reasons.includes(r);
  const byNumber = best.score >= AUTO_MIN_SCORE && has("numero") && has("montant_exact");
  const byAmountAndClient = Boolean(opts.amountAndClient) && has("montant_exact") && has("client") && !second;
  if (!byNumber && !byAmountAndClient) return null;
  if (second && second.score >= AUTO_MIN_SCORE) return null;
  return best;
}

export const REASON_LABEL: Record<MatchReason, string> = {
  numero: "n° de facture dans le libellé",
  montant_exact: "montant = reste dû",
  montant_total: "montant = total facture",
  acompte: "montant partiel",
  client: "nom du client",
  date: "date cohérente",
};
