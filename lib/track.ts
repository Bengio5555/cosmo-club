"use client";

import { track as vercelTrack } from "@vercel/analytics";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Same shape as the official gtag() snippet: push the `arguments` object
 * onto window.dataLayer, creating the queue if the GA script has not
 * run yet. gtag.js replays the queue when it loads, so events fired on
 * first render (wizard step 1, hero CTA on a fast click) are not lost —
 * `sendGAEvent` from @next/third-parties drops them with a warning when
 * the queue does not exist yet, which is the case during hydration.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function gtagPush(..._args: unknown[]): void {
  // gtag.js expects the `arguments` object itself, not an array.
  // eslint-disable-next-line prefer-rest-params
  const args = arguments;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/**
 * Single entry point for funnel events on the public site.
 *
 * Every event is sent to both destinations:
 *  - Google Analytics 4 (via the gtag dataLayer that <GoogleAnalytics />
 *    installs in the root layout) — this is where page views already
 *    live, so CTA clicks, wizard steps and submissions can be read next
 *    to them as a funnel, and Search Console can be linked for
 *    click → conversion by landing page.
 *  - Vercel Web Analytics — kept for when it is enabled on the project;
 *    the SDK silently drops events otherwise.
 *
 * Event names are stable identifiers (snake_case, ≤ 40 chars, GA4
 * limit). Keep property values low-cardinality so breakdowns stay
 * readable: a handful of named placements, step numbers, channel keys.
 */
export type TrackProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;

  // Strip undefined/null so both SDKs receive clean payloads.
  const clean: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props)) {
    if (v !== undefined && v !== null) clean[k] = v;
  }

  try {
    gtagPush("event", event, clean);
  } catch {
    // Storage or script blocked — never let analytics break the UI.
  }
  try {
    vercelTrack(event, clean);
  } catch {
    // Never let analytics break the UI.
  }
}

/** Funnel event names used across the site — one place to grep. */
export const EVENTS = {
  ctaClick: "devis_cta_click",
  wizardStep: "devis_step_view",
  wizardStepComplete: "devis_step_complete",
  wizardError: "devis_error",
  submitted: "devis_submitted",
  phoneClick: "phone_click",
  emailClick: "email_click",
  instagramClick: "instagram_click",
} as const;
