import { ImageResponse } from "next/og";
import { site } from "@/lib/site";
import fs from "node:fs/promises";
import path from "node:path";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const logoBuffer = await fs.readFile(
    path.join(process.cwd(), "public/brand/cosmo-logo.png"),
  );
  const logoSrc = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ede3c9",
          padding: 80,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={760}
          height={456}
          alt={site.name}
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 32,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 96,
              height: 2,
              background: "#C9A961",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#8B1A1A",
              fontFamily: "serif",
            }}
          >
            Bar à cocktails &amp; barista événementiel · Paris
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
