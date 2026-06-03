import * as Sentry from "@sentry/nextjs";

/**
 * Sentry init for the Node.js runtime (RSC, server actions, route
 * handlers, server components). Imported from `instrumentation.ts`
 * when NEXT_RUNTIME === "nodejs".
 *
 * Cost discipline (we're on the Developer/Free tier — 5k errors/mo):
 *   - tracesSampleRate: 0.05 → only 5% of transactions are kept. We
 *     don't need full APM here; what we want is the stack trace + the
 *     breadcrumbs around it. Bump this if/when we move to a paid plan.
 *   - No session replay on the server (replays are a browser-only
 *     concept anyway).
 *   - sendDefaultPii: false → respects RGPD. Sentry won't auto-attach
 *     the user's IP, cookies, or full headers. We can opt in per scope
 *     when we *want* to attach a user (e.g. dashboard owner email
 *     during a triaged bug).
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Empty string in dev so Sentry doesn't try to send local crashes
  // to prod — only "production" deployments report.
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.05,
  sendDefaultPii: false,
  // Strip Sentry's own console.log noise from prod bundles.
  debug: false,
  // Tag every event with the Vercel deploy SHA so we can correlate
  // crashes to a specific commit + roll back if a release regresses.
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  /**
   * Drop low-signal errors before they hit our quota. Add new patterns
   * here as we observe noise — keep this list short, broad ignores
   * mask real bugs.
   */
  ignoreErrors: [
    // Next.js's intentional control-flow throws (redirect, notFound,
    // unauthorized) — these are NOT bugs, they're how the framework
    // bubbles up navigations from server code.
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    "NEXT_HTTP_ERROR_FALLBACK",
    // Vercel kills long-running invocations at the platform level;
    // not actionable from our code.
    /FUNCTION_INVOCATION_TIMEOUT/i,
  ],
});
