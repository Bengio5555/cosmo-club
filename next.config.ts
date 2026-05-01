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
};

export default nextConfig;
