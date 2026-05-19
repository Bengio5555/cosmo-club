import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "cosmoclub-images";

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
 * Loads the static images-config.json and merges in the admin uploads
 * stored in the public Supabase Storage bucket. We moved off Vercel
 * Blob to escape the "Advanced Requests" quota — Supabase Storage
 * objects are served directly from the project's CDN, no proxy and
 * no per-request authentication cost.
 *
 * Failure to list/read the bucket is non-fatal: we fall back to the
 * static JSON config so the public site never breaks on a storage
 * outage.
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

  // Skip the storage merge if Supabase credentials aren't available
  // (build-time / local dev without env). Public site still gets the
  // static defaults so nothing breaks.
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!hasUrl || !hasKey) return config;

  try {
    const supabase = createAdminClient();
    const { data: files, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw error;
    if (!files || files.length === 0) return config;

    if (!config.pages.evenements) config.pages.evenements = {};

    for (const file of files) {
      // .list() returns folders too — skip anything that isn't an image.
      if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
      const { data: pub } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(file.name);
      const publicUrl = pub.publicUrl;

      // Filename convention: `{page}__{key}__{slug}.ext` routes the
      // image to a specific slot. Anything without that prefix lands
      // in the events gallery.
      const prefixMatch = file.name.match(/^([^_]+)__([^_]+)__(.+)$/);
      if (prefixMatch) {
        const [, page, key] = prefixMatch;
        if (!config.pages[page]) config.pages[page] = {};
        const existing = config.pages[page][key] || {};
        config.pages[page][key] = { ...existing, path: publicUrl };
        continue;
      }

      const key = file.name
        .replace(/\.[^.]+$/, "")
        .replace(/\W+/g, "-")
        .toLowerCase();
      if (!config.pages.evenements[key]) {
        config.pages.evenements[key] = {
          title: file.name.replace(/\.[^.]+$/, ""),
          path: publicUrl,
          orientation: "portrait",
          section: "Galerie Événements",
          label: "Événement",
        };
      }
    }
  } catch (err) {
    console.warn("[loadImagesConfig] Supabase Storage list failed:", err);
  }

  // Editorial overrides live in `image_overrides` (DB) — see
  // /dashboard/images. Apply them so public readers (homepage hero,
  // events gallery labels, etc.) see the latest titles / labels /
  // orientations even when the static JSON is stale.
  try {
    const supabase = createAdminClient();
    const { data: overrides } = await supabase
      .from("image_overrides")
      .select("page,image_key,title,label,orientation");
    for (const o of overrides ?? []) {
      const slot = config.pages[o.page]?.[o.image_key];
      if (!slot) continue;
      if (o.title) slot.title = o.title;
      if (o.label) slot.label = o.label;
      if (
        o.orientation === "portrait" ||
        o.orientation === "landscape" ||
        o.orientation === "square"
      ) {
        slot.orientation = o.orientation;
      }
    }
  } catch (err) {
    console.warn("[loadImagesConfig] overrides merge failed:", err);
  }

  return config;
}

// React.cache dedupes the work inside a single render request. Multiple
// server components calling getImagePath() during the same SSR pass
// will share one Supabase list + DB overrides fetch instead of N.
const cachedLoad = cache(loadImagesConfig);

export async function getImagesConfig(): Promise<ServerImageConfig> {
  return cachedLoad();
}

/** One-shot lookup with fallback. Mirrors `pickPath` in the client hook. */
export async function getImagePath(
  page: string,
  key: string,
  fallback: string,
): Promise<string> {
  const config = await cachedLoad();
  return config.pages?.[page]?.[key]?.path || fallback;
}
