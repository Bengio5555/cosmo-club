import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry smoke test endpoint. Hitting /api/sentry-test in production
 * should:
 *   1. Throw a labelled server-side error
 *   2. Cause Sentry to capture + email an alert within ~30 seconds
 *   3. Return a 500 with the marker payload so we know the throw
 *      really ran (vs an unrelated 500).
 *
 * Once we've confirmed the alert pipeline works end-to-end (initial
 * setup + any future infra change), this file can be deleted. Leaving
 * it long-term is fine too — the route 404s for any bot that didn't
 * receive the explicit URL.
 *
 * Protected by a query token so a random crawler can't burn quota by
 * hammering the route. Token is intentionally short — this is a
 * sanity check, not a security boundary.
 */
const TEST_TOKEN = "cosmo-test-ping";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("t") !== TEST_TOKEN) {
    return NextResponse.json(
      { ok: false, hint: "missing or invalid ?t=<token>" },
      { status: 404 },
    );
  }

  // Explicit capture so we don't depend on Next.js's onRequestError
  // bubble — the test should fail loudly even if framework wiring
  // regresses.
  const err = new Error(
    "[sentry-test] intentional test error — safe to ignore in Sentry",
  );
  Sentry.captureException(err, {
    tags: { source: "sentry-test-route" },
  });
  // Flush before the lambda freezes so the event reaches Sentry even
  // on cold-start invocations that exit right after the response.
  await Sentry.flush(2000);

  throw err;
}
