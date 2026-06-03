import * as Sentry from "@sentry/nextjs";

/**
 * Sentry bootstrap for Next.js 16. The `register()` hook fires once per
 * server instance (Node.js *and* Edge runtimes) before any request is
 * served. We branch on NEXT_RUNTIME and load the matching config file
 * so we can ship two distinct SDK configurations without bloating one
 * runtime with code it can't use (the Edge SDK is much smaller).
 *
 * The client-side init lives in `instrumentation-client.ts` — Next.js
 * 15.3+ picks it up automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Forward Next.js's server-side request errors to Sentry. Without this
 * hook, errors thrown during RSC rendering, server actions, or route
 * handlers might not reach Sentry's automatic instrumentation. The
 * Sentry SDK ships a ready-made implementation that mirrors the shape
 * Next.js expects.
 */
export const onRequestError = Sentry.captureRequestError;
