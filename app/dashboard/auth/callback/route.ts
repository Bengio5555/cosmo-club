import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase magic-link callback. The email link points here with a `code`
 * search param; exchange it for a session cookie and redirect to the
 * originally requested page (or the dashboard home).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // magiclink, email, signup, recovery…
  const next = url.searchParams.get("next") || "/dashboard";

  const supabase = await createClient();

  // Path 1 — PKCE/code flow (preferred, enabled by default on new projects).
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return redirectWithError(url, "code_exchange_failed", error.message);
  }

  // Path 2 — token_hash flow (fallback, older template / non-PKCE projects).
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "signup" | "recovery" | "invite" | "email_change",
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
    console.error("[auth/callback] verifyOtp failed:", error.message);
    return redirectWithError(url, "verify_otp_failed", error.message);
  }

  // Nothing actionable in the URL.
  console.error(
    "[auth/callback] missing code/token_hash. URL:",
    request.url,
    "search:",
    Object.fromEntries(url.searchParams.entries()),
  );
  return redirectWithError(url, "missing_code");
}

function redirectWithError(url: URL, code: string, detail?: string) {
  const login = new URL("/dashboard/login", url.origin);
  login.searchParams.set("error", code);
  if (detail) login.searchParams.set("detail", detail);
  return NextResponse.redirect(login);
}
