/**
 * Lead attribution — where a demande comes from.
 *
 * Shared between the public site (capture in localStorage, sent with the
 * devis form), the /api/devis route (derive a channel, persist) and the
 * dashboard (labels, filters, manual qualification). Pure, no I/O.
 */

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Full external referrer URL (never our own host). */
  referrer?: string;
  /** Pathname of the first page seen on the site. */
  landing_page?: string;
  captured_at?: string;
};

export const ATTRIBUTION_STORAGE_KEY = "cosmo_attr_v1";
/** First touch wins for 30 days, unless a later visit carries explicit UTMs. */
export const ATTRIBUTION_TTL_MS = 30 * 24 * 3600 * 1000;

/**
 * Canonical channel list. Online channels are derived automatically from
 * UTMs / referrer; offline ones are picked by hand in the dashboard when
 * a demande is typed in (phone call, recommendation, trade show…).
 */
export const CHANNELS = [
  { value: "google_organic", label: "Google (naturel)", group: "organic" },
  { value: "google_ads", label: "Google Ads", group: "paid" },
  { value: "bing_organic", label: "Bing", group: "organic" },
  { value: "instagram", label: "Instagram", group: "social" },
  { value: "instagram_paid", label: "Instagram (pub)", group: "paid" },
  { value: "facebook", label: "Facebook", group: "social" },
  { value: "facebook_paid", label: "Facebook (pub)", group: "paid" },
  { value: "linkedin", label: "LinkedIn", group: "social" },
  { value: "tiktok", label: "TikTok", group: "social" },
  { value: "mariages_net", label: "Mariages.net", group: "referral" },
  { value: "newsletter", label: "Newsletter / e-mail", group: "referral" },
  { value: "referral", label: "Autre site", group: "referral" },
  { value: "direct", label: "Accès direct", group: "direct" },
  { value: "telephone", label: "Téléphone", group: "offline" },
  { value: "recommandation", label: "Recommandation", group: "offline" },
  { value: "salon", label: "Salon / événement", group: "offline" },
  { value: "partenaire", label: "Partenaire", group: "offline" },
  { value: "autre", label: "Autre", group: "offline" },
] as const;

export type Channel = (typeof CHANNELS)[number]["value"];
export type ChannelGroup = (typeof CHANNELS)[number]["group"];

const BY_VALUE = new Map<string, (typeof CHANNELS)[number]>(
  CHANNELS.map((c) => [c.value, c]),
);

export function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && BY_VALUE.has(v);
}

export function channelLabel(v: string | null | undefined): string {
  if (!v) return "Non renseigné";
  return BY_VALUE.get(v)?.label ?? v;
}

export function channelGroup(v: string | null | undefined): ChannelGroup | null {
  if (!v) return null;
  return BY_VALUE.get(v)?.group ?? null;
}

/** Offline channels — the ones offered when a demande is typed by hand. */
export const OFFLINE_CHANNELS = CHANNELS.filter((c) => c.group === "offline");

function norm(v: string | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

export function hostOf(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const PAID_MEDIUMS = /^(cpc|ppc|paid|paid_social|paidsocial|paid-social|ads|display|sponsored)$/;

/**
 * Map raw attribution to a channel. UTMs win over the referrer (a paid
 * Instagram click carries utm_* even though the referrer is instagram.com).
 * No UTM and no external referrer → direct (typed URL, bookmark, or a
 * source that strips referrers such as most messaging apps).
 */
export function deriveChannel(a: Attribution | null | undefined): Channel {
  if (!a) return "direct";
  const src = norm(a.utm_source);
  const med = norm(a.utm_medium);
  const paid = PAID_MEDIUMS.test(med);

  if (src) {
    if (/google/.test(src)) return paid ? "google_ads" : "google_organic";
    if (/instagram|^ig$/.test(src)) return paid ? "instagram_paid" : "instagram";
    if (/facebook|^fb$|meta/.test(src)) return paid ? "facebook_paid" : "facebook";
    if (/linkedin/.test(src)) return "linkedin";
    if (/tiktok/.test(src)) return "tiktok";
    if (/mariages/.test(src)) return "mariages_net";
    if (/bing/.test(src)) return "bing_organic";
    if (/newsletter|email|e-mail|mail/.test(src) || /email|newsletter/.test(med)) {
      return "newsletter";
    }
    return "referral";
  }

  const host = hostOf(a.referrer);
  if (host) {
    if (/(^|\.)google\./.test(host)) return "google_organic";
    if (/(^|\.)bing\.com$/.test(host)) return "bing_organic";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    if (/(^|\.)facebook\.com$|(^|\.)fb\.com$/.test(host)) return "facebook";
    if (/(^|\.)linkedin\.com$|^lnkd\.in$/.test(host)) return "linkedin";
    if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
    if (/(^|\.)mariages\.net$/.test(host)) return "mariages_net";
    return "referral";
  }

  return "direct";
}

/** Read the attribution captured on the public site (client only). */
export function readStoredAttribution(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Attribution;
    const at = parsed.captured_at ? Date.parse(parsed.captured_at) : NaN;
    if (!Number.isFinite(at) || Date.now() - at > ATTRIBUTION_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}
