import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background:
            "radial-gradient(circle at 30% 20%, #1a0a0a 0%, #0A0A0A 60%, #000 100%)",
          color: "#ede3c9",
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: 28,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: "#C9A961",
            }}
          >
            Paris · Sur rendez-vous
          </div>
          <div
            style={{
              fontSize: 140,
              fontWeight: 900,
              lineHeight: 0.92,
              letterSpacing: -4,
              color: "#8B1A1A",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>COSMO</span>
            <span>CLUB</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            borderTop: "1px solid rgba(237, 227, 201, 0.3)",
            paddingTop: 32,
          }}
        >
          <div style={{ fontSize: 44, fontWeight: 500, color: "#ede3c9" }}>
            Bar à cocktails &amp; barista événementiel
          </div>
          <div style={{ fontSize: 26, color: "rgba(237, 227, 201, 0.7)" }}>
            Mariages · Corporate · Soirées privées · Paris &amp; Île-de-France
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
