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
    // Next.js 16 requires an explicit allowlist for local URLs that
    // carry a query string. Admin uploads are served through
    // /api/admin/image-proxy?url=<base64-blob-url>; without this
    // entry, next/image refuses to optimize and the build fails at
    // prerender time.
    localPatterns: [
      {
        pathname: "/api/admin/image-proxy",
        // `search` omitted on purpose: matchLocalPattern uses strict
        // equality, so leaving it undefined lets next/image accept any
        // ?url=… payload coming out of the proxy.
      },
    ],
  },
};

export default nextConfig;
