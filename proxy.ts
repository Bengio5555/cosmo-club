import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * - Refreshes the Supabase session on every navigation so the cookie stays
 *   valid across server and client components.
 * - Protects /dashboard/**: if no session, redirect to /dashboard/login.
 *   The login + auth callback routes are allowed through.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() must be called to refresh the session on every
  // request. Do not skip this call — the @supabase/ssr client relies on it
  // to rotate tokens before they expire.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isDashboard = pathname.startsWith("/dashboard");
  const isLogin = pathname.startsWith("/dashboard/login");
  const isAuthCallback = pathname.startsWith("/dashboard/auth");

  if (isDashboard && !isLogin && !isAuthCallback && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // If already signed in, bounce off the login page.
  if (isLogin && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.searchParams.delete("from");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all /dashboard/** and the auth callback. Skip static assets and
    // the public site so performance isn't impacted.
    "/dashboard/:path*",
  ],
};
