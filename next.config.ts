import type { NextConfig } from "next";

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
    // Next.js 16 ships a default localPatterns of
    // { pathname: "**", search: "" } that rejects local image URLs
    // carrying a query string. Once we declare *any* localPatterns
    // entry, the default is dropped — so we must restate both the
    // permissive default for static `/...` paths AND a dedicated
    // entry that lets the admin upload proxy URLs through.
    localPatterns: [
      // Match static paths (`/brand/ai/...`, `/_next/static/...`) with
      // no query string — the original default behavior.
      { pathname: "/**", search: "" },
      // Admin uploads served through /api/admin/image-proxy?url=…
      // (omitting `search` here matches *any* query string because
      // matchLocalPattern uses strict equality on the property and
      // skips the check when it's undefined).
      { pathname: "/api/admin/image-proxy" },
    ],
  },
};

export default nextConfig;
