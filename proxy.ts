import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import {
  rolesForPath,
  defaultRouteForRole,
  type UserRole,
} from "@/lib/auth/roles";
import { aiBotName } from "@/lib/geo/aiBots";

/**
 * Next.js 16 proxy (formerly middleware).
 *
 * - Refreshes the Supabase session on every navigation so the cookie stays
 *   valid across server and client components.
 * - Protects /dashboard/**: if no session, redirect to /dashboard/login.
 *   The login + auth callback routes are allowed through.
 */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  // Public pages only reach the proxy for AI crawlers (see the second
  // matcher entry): log the hit off the response path and let it through.
  if (!request.nextUrl.pathname.startsWith("/dashboard")) {
    const bot = aiBotName(request.headers.get("user-agent"));
    if (bot) event.waitUntil(logAiBotHit(bot, request.nextUrl.pathname));
    return NextResponse.next();
  }

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

  // Role-based access control: every authenticated dashboard navigation
  // (except the login + auth callback routes) must pass the role check.
  // The proxy is the single chokepoint, so a user typing /dashboard/factures
  // directly in the URL bar is filtered here before any page renders.
  if (isDashboard && !isLogin && !isAuthCallback && user) {
    const allowed = rolesForPath(pathname);
    if (allowed.length > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const role = (profile?.role as UserRole | undefined) ?? null;
      if (!role || !allowed.includes(role)) {
        const url = request.nextUrl.clone();
        // Role-aware landing: staff can't open the dashboard home, so
        // bouncing them there would loop — send them to their default
        // allowed route instead.
        url.pathname = defaultRouteForRole(role);
        url.searchParams.set("denied", "1");
        return NextResponse.redirect(url);
      }
    }
  }

  return response;
}

/**
 * Best-effort insert into ai_bot_hits through PostgREST with the service
 * key (the table has no insert policy). No IP, no full user-agent: bot
 * name + path only. Failures are swallowed — logging must never break a
 * crawl.
 */
async function logAiBotHit(bot: string, pathname: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/ai_bot_hits`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ bot, path: pathname.slice(0, 200) }),
    });
  } catch {
    // ignore
  }
}

export const config = {
  matcher: [
    // Run on all /dashboard/** and the auth callback. Skip static assets and
    // the public site so performance isn't impacted.
    "/dashboard/:path*",
    // Public pages: only when the user-agent is an AI crawler, so regular
    // visitors never pay for a proxy invocation. Must stay a literal (the
    // matcher is analysed at build time) — keep in sync with AI_BOTS (lib/geo/aiBots.ts).
    {
      source: "/((?!api|_next/static|_next/image|dashboard|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|css|js|woff2?)$).*)",
      has: [
        {
          type: "header",
          key: "user-agent",
          value:
            ".*(OAI-SearchBot|ChatGPT-User|GPTBot|Claude-User|Claude-SearchBot|ClaudeBot|Perplexity-User|PerplexityBot|CCBot|Bytespider|meta-externalagent|MistralAI-User).*",
        },
      ],
    },
  ],
};
