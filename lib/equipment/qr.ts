import "server-only";
import QRCode from "qrcode";
import { qrUrlForToken } from "./shared";

/** QR as an inline SVG string (no raster, prints crisp at any size). */
export async function qrSvgForToken(token: string): Promise<string> {
  return QRCode.toString(qrUrlForToken(token), {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#1a1614", light: "#ffffff00" },
  });
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
