import type { Database } from "@/types/database";

export type EventType = Database["public"]["Enums"]["event_type"];

/** Fixed series order : the colour follows the type, never its rank. */
export const REVENUE_TYPES: EventType[] = ["mariage", "corporate", "prive", "defile", "lancement", "autre"];

export const REVENUE_TYPE_LABEL: Record<EventType, string> = {
  mariage: "Mariage",
  corporate: "Corporate",
  prive: "Soirée privée",
  defile: "Défilé / Mode",
  lancement: "Lancement",
  autre: "Autre / non renseigné",
};

export type RevenueSplit = Record<EventType, number>;
export type RevenuePoint = { month: string; total: number; byType: RevenueSplit };

export function emptyRevenueSplit(): RevenueSplit {
  return { mariage: 0, corporate: 0, prive: 0, defile: 0, lancement: 0, autre: 0 };
}

/**
 * Règle du chiffre d'affaires, commune au Tableau de bord et à la page
 * Factures :
 *  - une facture compte dès qu'elle est émise (ni brouillon, ni annulée) ;
 *  - un avoir se déduit dès sa création, brouillon compris : il reçoit à
 *    ce moment-là son numéro définitif et sa date ;
 *  - sauf un avoir annulé, ou dont la facture source est annulée (elle
 *    est déjà sortie du CA : déduire l'avoir en plus la compterait deux
 *    fois).
 */
export function countsInRevenue(
  inv: { status: string; is_credit_note: boolean },
  sourceStatus?: string | null,
): boolean {
  if (inv.status === "annule") return false;
  if (!inv.is_credit_note) return inv.status !== "brouillon";
  return sourceStatus !== "annule";
}
