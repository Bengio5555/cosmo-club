/**
 * Accusé de réception d'une demande : l'e-mail envoyé au prospect juste
 * après le formulaire de devis. Pur (pas d'I/O) : partagé par /api/devis,
 * le webhook Resend et le dashboard (liste et fiche des demandes).
 * Colonnes : docs/migrations/2026-11-05_lead_ack_email.sql.
 */

/** Tag Resend de l'accusé, pour que le webhook le reconnaisse. */
export const LEAD_ACK_TAG = { name: "category", value: "accuse" } as const;

export const LEAD_ACK_COLUMNS =
  "ack_email_id,ack_sent_at,ack_delivered_at,ack_opened_at,ack_problem_at,ack_problem";

export type LeadAck = {
  ack_email_id?: string | null;
  ack_sent_at?: string | null;
  ack_delivered_at?: string | null;
  ack_opened_at?: string | null;
  ack_problem_at?: string | null;
  ack_problem?: string | null;
};

export type AckState = {
  kind: "remis" | "parti" | "probleme";
  /** Libellé court, pour l'infobulle et la fiche. */
  label: string;
  /** Date de l'étape affichée. */
  at: string | null;
  /** Précision : motif du problème, ou mention de l'ouverture. */
  detail: string | null;
};

/**
 * État de l'accusé, du plus grave au plus favorable. `null` quand aucun
 * accusé n'est connu : demande saisie à la main, demande antérieure au
 * suivi, ou robot probable (le Book n'est pas envoyé).
 */
export function ackState(l: LeadAck): AckState | null {
  if (l.ack_problem_at) {
    return {
      kind: "probleme",
      label: "Accusé de réception non remis",
      at: l.ack_problem_at,
      detail: l.ack_problem ?? null,
    };
  }
  if (l.ack_delivered_at || l.ack_opened_at) {
    return {
      kind: "remis",
      label: "Accusé de réception remis",
      at: l.ack_delivered_at ?? l.ack_opened_at ?? null,
      detail: l.ack_opened_at ? "Ouvert par le prospect" : null,
    };
  }
  if (l.ack_sent_at || l.ack_email_id) {
    return {
      kind: "parti",
      label: "Accusé de réception parti",
      at: l.ack_sent_at ?? null,
      detail: "En attente de la confirmation de remise",
    };
  }
  return null;
}
