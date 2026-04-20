export interface ImageConfig {
  title: string;
  path: string;
  orientation: "portrait" | "landscape" | "square";
  section: string;
  label?: string;
}

export interface Config {
  pages: Record<string, Record<string, ImageConfig>>;
}

export const LABEL_OPTIONS = [
  "Mariage",
  "Corporate",
  "Défilé",
  "Privé",
  "Lancement",
  "Événement",
] as const;

export type LabelOption = typeof LABEL_OPTIONS[number];
