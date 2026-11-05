/**
 * Export PNG d'une étiquette QR (navigateur uniquement). L'image est
 * dessinée sur un canvas à 300 points par pouce, à la largeur demandée
 * en centimètres, et le PNG porte cette résolution (bloc pHYs) : ouvert
 * dans Aperçu, Word ou un logiciel d'étiqueteuse, il s'imprime à la
 * bonne taille sans réglage.
 */

export type LabelData = {
  code: string;
  name: string;
  category: string;
  qr: { size: number; bits: string };
};

const DPI = 300;
const INK = "#1a1614";
const GRENAT = "#8b1a1a";
const MUTED = "#5a5147";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const cmToPx = (cm: number) => Math.round((cm / 2.54) * DPI);

/** Coupe un texte en lignes qui tiennent dans `maxWidth` (coupe aussi après un tiret). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const tokens = text.split(/(?<=[\s-])/); // garde l'espace ou le tiret en fin de morceau
  const lines: string[] = [];
  let line = "";
  for (const t of tokens) {
    const candidate = line + t;
    if (line && ctx.measureText(candidate.trimEnd()).width > maxWidth) {
      lines.push(line.trimEnd());
      line = t;
    } else {
      line = candidate;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/** Dessine l'étiquette et renvoie le canvas (hauteur ajustée au contenu). */
export function drawLabel(label: LabelData, widthCm: number): HTMLCanvasElement {
  const W = cmToPx(widthCm);
  const pad = Math.round(W * 0.07);
  const inner = W - pad * 2;

  // Modules de taille entière : des bords nets, donc un QR qui se scanne bien.
  const n = label.qr.size;
  const cell = Math.max(1, Math.floor(inner / n));
  const qrSize = cell * n;

  const codeFont = Math.round(W * 0.085);
  const nameFont = Math.round(W * 0.055);
  const catFont = Math.round(W * 0.042);
  const brandFont = Math.round(W * 0.036);

  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `700 ${codeFont}px ${MONO}`;
  const codeLines = wrap(measure, label.code, inner);
  measure.font = `400 ${nameFont}px ${SANS}`;
  const nameLines = wrap(measure, label.name, inner);

  const gap = Math.round(W * 0.04);
  const H =
    pad +
    qrSize +
    gap +
    codeLines.length * Math.round(codeFont * 1.2) +
    Math.round(gap * 0.4) +
    nameLines.length * Math.round(nameFont * 1.3) +
    Math.round(gap * 0.7) +
    Math.round(catFont * 1.3) +
    Math.round(gap * 0.6) +
    Math.round(brandFont * 1.3) +
    pad;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // QR
  const qx = Math.round((W - qrSize) / 2);
  ctx.fillStyle = INK;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (label.qr.bits[r * n + c] === "1") ctx.fillRect(qx + c * cell, pad + r * cell, cell, cell);
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const cx = W / 2;
  let y = pad + qrSize + gap;

  ctx.font = `700 ${codeFont}px ${MONO}`;
  ctx.fillStyle = INK;
  for (const l of codeLines) {
    ctx.fillText(l, cx, y);
    y += Math.round(codeFont * 1.2);
  }
  y += Math.round(gap * 0.4);

  ctx.font = `400 ${nameFont}px ${SANS}`;
  for (const l of nameLines) {
    ctx.fillText(l, cx, y);
    y += Math.round(nameFont * 1.3);
  }
  y += Math.round(gap * 0.7);

  const spaced = (text: string, font: string, color: string, spacingEm: number) => {
    ctx.font = font;
    ctx.fillStyle = color;
    const px = parseFloat(font.match(/(\d+)px/)?.[1] ?? "12");
    // letterSpacing existe sur les navigateurs récents ; sans lui le texte reste lisible.
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${(px * spacingEm).toFixed(1)}px`;
    ctx.fillText(text.toUpperCase(), cx, y);
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  };
  spaced(label.category, `600 ${catFont}px ${SANS}`, GRENAT, 0.12);
  y += Math.round(catFont * 1.3) + Math.round(gap * 0.6);
  spaced("Cosmo Club Paris", `500 ${brandFont}px ${SANS}`, MUTED, 0.1);

  return canvas;
}

/* ─── PNG : résolution d'impression (bloc pHYs) ─────────────────── */

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Insère le bloc pHYs (points par mètre) juste après l'en-tête IHDR. */
function withDpi(png: Uint8Array, dpi: number): Uint8Array {
  const IHDR_END = 8 + 25; // signature + bloc IHDR complet
  if (png.length < IHDR_END) return png;
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9); // longueur des données
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  view.setUint32(8, ppm);
  view.setUint32(12, ppm);
  chunk[16] = 1; // unité : mètre
  view.setUint32(17, crc32(chunk.subarray(4, 17)));
  const out = new Uint8Array(png.length + chunk.length);
  out.set(png.subarray(0, IHDR_END), 0);
  out.set(chunk, IHDR_END);
  out.set(png.subarray(IHDR_END), IHDR_END + chunk.length);
  return out;
}

/** Nom de fichier sûr : etiquette-BAR-N1-6cm.png */
export function labelFileName(code: string, widthCm: number): string {
  const safe = code
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `etiquette-${safe || "qr"}-${String(widthCm).replace(".", "_")}cm.png`;
}

/** Génère le PNG de l'étiquette et lance son téléchargement. */
export async function downloadLabel(label: LabelData, widthCm: number): Promise<void> {
  const canvas = drawLabel(label, widthCm);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Image impossible à générer.");
  const bytes = withDpi(new Uint8Array(await blob.arrayBuffer()), DPI);
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: "image/png" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = labelFileName(label.code, widthCm);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
