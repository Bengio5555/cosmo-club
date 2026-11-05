/**
 * Motif de refus d'un devis. Pur (pas d'I/O) : partagé par la fenêtre de
 * refus de la plaquette publique, l'action serveur, l'e-mail « Devis
 * refusé » et le dashboard. Les clés sont celles de la contrainte SQL
 * (migration 2026-11-05_quote_refusal_reason.sql).
 */

export const REFUSAL_REASONS = ["budget", "date", "autre_prestataire", "autre"] as const;
export type RefusalReason = (typeof REFUSAL_REASONS)[number];
export const REFUSAL_COMMENT_MAX = 600;

const LABELS: Record<RefusalReason, { fr: string; en: string }> = {
  budget: { fr: "Budget trop élevé", en: "Over budget" },
  date: { fr: "Date ou événement annulé", en: "Date or event cancelled" },
  autre_prestataire: { fr: "Autre prestataire retenu", en: "Chose another provider" },
  autre: { fr: "Autre raison", en: "Other reason" },
};

export function isRefusalReason(x: unknown): x is RefusalReason {
  return typeof x === "string" && (REFUSAL_REASONS as readonly string[]).includes(x);
}

export function refusalReasonLabel(reason: string | null | undefined, locale: "fr" | "en" = "fr"): string | null {
  return isRefusalReason(reason) ? LABELS[reason][locale] : null;
}

/** Mot libre du client : espaces normalisés, longueur bornée, null si vide. */
export function cleanRefusalComment(x: unknown): string | null {
  if (typeof x !== "string") return null;
  const s = x.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, REFUSAL_COMMENT_MAX);
  return s || null;
}
