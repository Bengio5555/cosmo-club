import { promises as fs } from "node:fs";
import path from "node:path";

let cached: string | null = null;

/**
 * Reads the Cosmo Club PNG logo from disk and returns it as a
 * data:image/png;base64 URL. @react-pdf/renderer can take a remote
 * URL but on Vercel that introduces a fetch dependency at PDF render
 * time; a local read + data URL is faster and never fails on cold
 * starts.
 *
 * Cached at module scope so subsequent PDF renders (a quote + its CGV
 * page, or a batch of invoices) share the same buffer.
 */
export async function getCompanyLogoDataUrl(): Promise<string | null> {
  if (cached) return cached;
  try {
    const file = path.join(process.cwd(), "public", "brand", "cosmo-logo.png");
    const buf = await fs.readFile(file);
    cached = `data:image/png;base64,${buf.toString("base64")}`;
    return cached;
  } catch (err) {
    // Better to ship a logoless PDF than to crash the accept flow.
    console.error("[pdf/logo] could not read public/brand/cosmo-logo.png", err);
    return null;
  }
}
