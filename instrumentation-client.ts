import * as Sentry from "@sentry/nextjs";

/**
 * Sentry client-side init. Next.js 15.3+ auto-loads this file before
 * React hydration, so error tracking is armed from the very first
 * frame the browser paints — even crashes inside hydration get
 * captured with a clean stack.
 *
 * Cost discipline (Developer/Free tier):
 *   - tracesSampleRate 0.05 → 5% of page loads are profiled.
 *   - replaysSessionSampleRate 0 → no random session replays; they
 *     burn quota fast and we'd rather pay for raw errors.
 *   - replaysOnErrorSampleRate 0 → also disabled. The day we want
 *     visual context for a tough client-side bug we can flip this
 *     to 0.1 and re-deploy.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  tracesSampleRate: 0.05,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  sendDefaultPii: false,
  debug: false,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  /**
   * Browser noise that we *never* want to act on. These are either
   * 3rd-party extensions, well-known browser quirks, or transient
   * network failures the user usually solves by refreshing.
   */
  ignoreErrors: [
    // ResizeObserver loop warning — emitted by many UI libs, not a bug.
    /ResizeObserver loop/i,
    // Browser extensions / content scripts crashing in their own
    // sandbox. We can't fix what we can't reach.
    /chrome-extension:\/\//i,
    /moz-extension:\/\//i,
    // Extension globals injected into the page scope, so they report
    // with our own URL as the culprit (denyUrls can't catch them) —
    // these were the entire top of our Sentry noise (~90% of events,
    // all from clients opening /briefing in their own browsers):
    //   - __firefox__         → Firefox iOS reader-mode injection
    //   - window.ethereum     → crypto wallet extensions (MetaMask…)
    //   - DarkReader          → Dark Reader extension
    /__firefox__/i,
    /window\.ethereum/i,
    /\bethereum\b.*selectedAddress/i,
    /DarkReader/i,
    // Our own one-off connectivity test fired from the Sentry setup.
    /\[sentry-test\]/i,
    // React DOM mutation crashes during node cleanup — the stack is
    // entirely inside react-dom (commitDeletionEffectsOnFiber →
    // removeChild/insertBefore), never our code. Caused by an external
    // agent mutating the DOM out from under React: Google Translate,
    // browser extensions, or headless crawlers (our occurrences came
    // from a HeadlessChrome bot in a datacenter).
    /removeChild/i,
    /insertBefore/i,
    "The node to be removed is not a child of this node",
    // Stale Server Action reference: fires when a visitor had the page
    // open across a deploy and posts to an action id that no longer
    // exists. Self-heals on refresh — not an app bug.
    /Failed to find Server Action/i,
    "ChunkLoadError",
    // User left the tab mid-fetch; aborting is expected, not a crash.
    "AbortError",
    // Safari ITP / private mode storage refusals; surface only if it
    // becomes a real product issue.
    "QuotaExceededError",
    // Transient network failures bubbling to the global handler:
    // "Load failed" (Safari/WebKit/Arc) and "Failed to fetch"
    // (Chromium) are aborted/dropped fetches — flaky connection, tab
    // closed mid-request, or an extension blocking a call. Not app
    // bugs, and they'd otherwise be the top noise source on mobile.
    "Load failed",
    "Failed to fetch",
    /NetworkError when attempting to fetch/i,
  ],
  /**
   * Drop entire events whose request URL points at a third-party
   * domain we don't control (analytics scripts, ad pixels). Keeps
   * our quota for things we can actually fix.
   */
  denyUrls: [
    /googletagmanager\.com/i,
    /google-analytics\.com/i,
    /facebook\.net/i,
    /clarity\.ms/i,
  ],
});

/**
 * Bridge Next.js's App Router navigations to Sentry as breadcrumbs.
 * Required for trace continuity across client-side navigations on
 * Next.js 15.3+ — without it, a crash on page B loses the trail of
 * how the user got there from page A.
 */
export const onRouterTransitionStart =
  Sentry.captureRouterTransitionStart;
