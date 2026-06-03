import * as Sentry from "@sentry/nextjs";

/**
 * Sentry init for the Edge runtime (middleware, edge route handlers).
 * The Edge SDK is intentionally minimal — no profiling, no APM
 * integrations — because the V8 isolate can't load Node modules.
 *
 * We currently don't run anything on the Edge runtime (middleware.ts
 * is absent, all route handlers default to Node), so this init is a
 * safety net: if we add an edge route later, errors there will be
 * captured without further config.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  tracesSampleRate: 0.05,
  sendDefaultPii: false,
  debug: false,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  ignoreErrors: [
    "NEXT_REDIRECT",
    "NEXT_NOT_FOUND",
    "NEXT_HTTP_ERROR_FALLBACK",
  ],
});
