import type { Database } from "@/types/database";

type EventType = Database["public"]["Enums"]["event_type"];

const labels: Record<EventType, string> = {
  mariage:   "Mariage",
  corporate: "Corporate",
  prive:     "Soirée privée",
  defile:    "Défilé / Mode",
  lancement: "Lancement",
  autre:     "Autre",
};

export function EventTypeLabel({ value }: { value: EventType | null | undefined }) {
  if (!value) return <span className="text-slate-500">—</span>;
  return <span className="text-xs text-slate-200">{labels[value] ?? value}</span>;
}
