import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { list } from "@vercel/blob";

export type ServerImageSlot = {
  path?: string;
  title?: string;
  orientation?: string;
  section?: string;
  label?: string;
};

export type ServerImageConfig = {
  pages: Record<string, Record<string, ServerImageSlot>>;
};

/**
 * Server-side equivalent of /api/images-full. Use this from server
 * components so the resolved image URL is part of the SSR HTML — no
 * mid-flight flash where the static fallback paints first and is then
 * replaced by the admin upload after the client-side hook resolves.
 *
 * Cached for 60s via React's request memo (callers within the same
 * server render share one fetch). The blob list is cheap enough that
 * a longer TTL isn't worth the staleness — admin uploads should land
 * within the next minute at most.
 */
async function loadImagesConfig(): Promise<ServerImageConfig> {
  const configPath = join(process.cwd(), "public", "images-config.json");
  let config: ServerImageConfig;
  try {
    const raw = await readFile(configPath, "utf-8");
    config = JSON.parse(raw) as ServerImageConfig;
  } catch (err) {
    console.error("[loadImagesConfig] read static config failed:", err);
    return { pages: {} };
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return config;

  try {
    const blobs = await list({
      prefix: "cosmo-club/images/",
      token: blobToken,
    });
    if (!blobs.blobs?.length) return config;

    if (!config.pages.evenements) config.pages.evenements = {};

    const sorted = [...blobs.blobs].sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return ta - tb;
    });

    for (const blob of sorted) {
      const filename = blob.pathname.split("/").pop() || "";
      const encodedUrl = Buffer.from(blob.url).toString("base64");
      const proxyUrl = `/api/admin/image-proxy?url=${encodedUrl}`;

      const prefixMatch = filename.match(/^([^_]+)__([^_]+)__(.+)$/);
      if (prefixMatch) {
        const [, page, key] = prefixMatch;
        if (!config.pages[page]) config.pages[page] = {};
        const existing = config.pages[page][key] || {};
        config.pages[page][key] = { ...existing, path: proxyUrl };
        continue;
      }

      const key = filename
        .replace(/\.[^.]+$/, "")
        .replace(/\W+/g, "-")
        .toLowerCase();
      if (!config.pages.evenements[key]) {
        config.pages.evenements[key] = {
          title: filename.replace(/\.[^.]+$/, ""),
          path: proxyUrl,
          orientation: "portrait",
          section: "Galerie Événements",
          label: "Événement",
        };
      }
    }
  } catch (err) {
    console.warn("[loadImagesConfig] blob list failed:", err);
  }

  return config;
}

export async function getImagesConfig(): Promise<ServerImageConfig> {
  return loadImagesConfig();
}

/** One-shot lookup with fallback. Mirrors `pickPath` in the client hook. */
export async function getImagePath(
  page: string,
  key: string,
  fallback: string,
): Promise<string> {
  const config = await loadImagesConfig();
  return config.pages?.[page]?.[key]?.path || fallback;
}
