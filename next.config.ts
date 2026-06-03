import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vercel's default 1 MB cap on Server Action bodies kills any
      // photo upload through /dashboard/images (HTTP 400 before our
      // own size check runs). Bumping to 10 MB fits high-res JPEGs
      // and PNGs from a regular camera while still sane.
      bodySizeLimit: "10mb",
    },
  },
  images: {
    // Default permissive entry for static `/brand/...` and `/_next/...`
    // paths (Next.js 16 drops the default once we declare any entry).
    localPatterns: [
      { pathname: "/**", search: "" },
      // Legacy Vercel Blob proxy — kept so existing CDN-cached variants
      // still resolve while the migration to Supabase is in flight.
      { pathname: "/api/admin/image-proxy" },
    ],
    // Allow next/image to optimize Supabase Storage public URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rqqjndxxjpsdkbtqikyn.supabase.co",
        pathname: "/storage/v1/object/public/cosmoclub-images/**",
      },
      {
        protocol: "https",
        hostname: "rqqjndxxjpsdkbtqikyn.supabase.co",
        pathname: "/storage/v1/object/public/cosmoclub-logos/**",
      },
    ],
  },
};

/**
 * Sentry wrap: uploads source maps at build time so prod stack traces
 * resolve to readable code, and rewrites client routes through a
 * `/monitoring` tunnel that bypasses ad-blockers (a meaningful chunk
 * of visitors would otherwise have their errors silently dropped).
 *
 * Behaviour is gated on env vars so a build without `SENTRY_AUTH_TOKEN`
 * (e.g. a contributor's first `next build`) still succeeds — it just
 * skips the source-map upload. Vercel production builds get the token
 * from the encrypted env and produce a fully symbolicated artifact.
 */
export default withSentryConfig(nextConfig, {
  // From the Sentry project URL — keep these in sync if we rename.
  org: "cosmo-club-paris",
  project: "javascript-nextjs",

  // Auth token used to upload source maps + releases. Add it as
  // SENTRY_AUTH_TOKEN in Vercel; the build skips uploads if missing.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Don't spam CI logs with Sentry chatter unless we explicitly want it.
  silent: !process.env.CI,

  // Source-map upload covers chunks that Next.js doesn't ship to the
  // browser by default (server-only code that ends up symbolicating
  // server-side stack traces). Costs a tiny bit of build time.
  widenClientFileUpload: true,

  // Tunnel client-side events through our own origin so AdBlock /
  // uBlock don't drop the report. The /monitoring path is rewritten
  // to Sentry's ingestion endpoint at build time.
  tunnelRoute: "/monitoring",

  // NOTE — options omitted intentionally:
  //   - `hideSourceMaps`: removed from the v10.x typings. The SDK
  //     now deletes uploaded source maps from the build output by
  //     default, which is what we want (no .map fetchable next to
  //     the bundle). Re-add via `sourcemaps: { deleteFilesAfterUpload }`
  //     only if we ever need to ship maps to the CDN.
  //   - `disableLogger`, `automaticVercelMonitors`: both flagged as
  //     "Not supported with Turbopack" — we omit them so the build
  //     doesn't emit deprecation noise. Cron monitoring can be
  //     re-enabled per-route via Sentry.withMonitor when needed.
});
