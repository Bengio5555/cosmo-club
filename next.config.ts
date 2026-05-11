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
    ],
  },
};

export default nextConfig;
