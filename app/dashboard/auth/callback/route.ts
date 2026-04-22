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
  const next = url.searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Fallback: back to login with an error flag.
  const login = new URL("/dashboard/login", url.origin);
  login.searchParams.set("error", "auth_callback_failed");
  return NextResponse.redirect(login);
}
