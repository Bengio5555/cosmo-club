"use client";

import { useEffect } from "react";
import {
  ATTRIBUTION_STORAGE_KEY,
  readStoredAttribution,
  type Attribution,
} from "@/lib/attribution";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

/**
 * Remembers where a visitor came from so the devis form can attach it to
 * the demande. Runs once per page load, writes localStorage only.
 *
 * Rules: the first touch is kept for 30 days; a later visit that carries
 * explicit UTMs (a new campaign) replaces it. Internal navigation never
 * counts as a referrer. Nothing personal is stored — only the campaign
 * tags Meta/Google put in the URL, the referring site and the landing path.
 */
export function AttributionCapture() {
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const fresh: Attribution = {};
      for (const k of UTM_KEYS) {
        const v = url.searchParams.get(k)?.trim();
        if (v) fresh[k] = v.slice(0, 120);
      }
      // Platform click ids (Google Ads / Meta / TikTok / Microsoft add them
      // automatically). Stored as "name:value" so the channel logic knows
      // which platform tagged the click.
      for (const k of ["gclid", "fbclid", "ttclid", "msclkid"]) {
        const v = url.searchParams.get(k)?.trim();
        if (v) {
          fresh.click_id = `${k}:${v.slice(0, 100)}`;
          break;
        }
      }
      const hasUtm = UTM_KEYS.some((k) => fresh[k]) || Boolean(fresh.click_id);

      if (document.referrer) {
        try {
          const ref = new URL(document.referrer);
          if (ref.host !== window.location.host) {
            fresh.referrer = ref.href.slice(0, 300);
          }
        } catch {
          /* malformed referrer — ignore */
        }
      }

      const existing = readStoredAttribution();
      // First touch wins; only an explicit campaign overrides it.
      if (existing && !hasUtm) return;

      const record: Attribution = {
        ...fresh,
        landing_page: url.pathname.slice(0, 200),
        captured_at: new Date().toISOString(),
      };
      window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* localStorage unavailable (private mode, blocked) — attribution is optional */
    }
  }, []);

  return null;
}
