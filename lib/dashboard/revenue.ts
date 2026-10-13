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
