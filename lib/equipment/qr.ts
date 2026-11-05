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

/**
 * Matrice du QR, pour le dessiner soi-même (export PNG des étiquettes) :
 * `size` modules de côté, `bits` = une chaîne de 0/1 ligne par ligne.
 */
export function qrMatrixForToken(token: string): { size: number; bits: string } {
  const { modules } = QRCode.create(qrUrlForToken(token), { errorCorrectionLevel: "M" });
  let bits = "";
  for (let i = 0; i < modules.data.length; i++) bits += modules.data[i] ? "1" : "0";
  return { size: modules.size, bits };
}
