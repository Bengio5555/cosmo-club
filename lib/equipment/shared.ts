// Pure module: shared by server components, server actions and client
// components (scan screen, labels). No server-only imports here.
import type { Database } from "@/types/database";

export type EquipmentCategory = Database["public"]["Enums"]["equipment_category"];
export type EquipmentPhase = Database["public"]["Enums"]["equipment_phase"];
export type EquipmentScanResult = Database["public"]["Enums"]["equipment_scan_result"];

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = ["bar", "caisse", "tech", "verrerie", "autre"];

export const EQUIPMENT_CATEGORY_LABEL: Record<EquipmentCategory, string> = {
  bar: "Bar",
  caisse: "Caisse",
  tech: "Tech",
  verrerie: "Verrerie",
  autre: "Autre",
};

export const PHASE_LABEL: Record<EquipmentPhase, string> = {
  depart: "Départ du stock",
  retour: "Retour au camion",
};

/** Base URL printed inside the QR codes. Production domain by default so a
 *  label printed from a preview still opens the right site. */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.cosmoclub.fr").replace(/\/$/, "");
}

/** The QR holds a public URL: scanned with the phone camera it opens the
 *  element page; scanned in the module we extract the token from it. */
export function qrUrlForToken(token: string): string {
  return `${siteOrigin()}/q/${token}`;
}

/** Accepts a full URL (…/q/<token>), a bare token, or garbage → null. */
export function tokenFromScan(raw: string): string | null {
  const text = raw.trim();
  const m = text.match(/\/q\/([a-f0-9]{16,64})(?:[/?#]|$)/i);
  if (m) return m[1].toLowerCase();
  if (/^[a-f0-9]{16,64}$/i.test(text)) return text.toLowerCase();
  return null;
}

/** Normalises a code typed by the operator: trims, upper-cases, collapses
 *  spaces and underscores into dashes (« caisse 7 » → « CAISSE-7 »). */
export function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
