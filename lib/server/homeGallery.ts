import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getImagesConfig, type ServerImageSlot } from "@/lib/server/imagesConfig";

export type GalleryTile = {
  key: string;
  url: string;
  label: string;
};

const HOME_LIMIT = 8;

/**
 * All evenements images, in their natural config order. Used by the
 * /evenements page where the visitor sees the full library.
 */
export async function getAllEventTiles(): Promise<GalleryTile[]> {
  const config = await getImagesConfig();
  const evenements = config.pages?.evenements ?? {};
  return Object.entries(evenements)
    .filter((entry): entry is [string, ServerImageSlot] =>
      typeof entry[1]?.path === "string",
    )
    .map(([key, slot]) => ({
      key,
      url: slot.path as string,
      label: slot.label || slot.title || "Événement",
    }));
}

/**
 * Curated subset for the home: respects the order set in
 * `homepage_gallery_selection` and caps at 8. If the owner hasn't
 * picked anything yet, falls back to the first 8 from the full set so
 * the home is never empty.
 */
export async function getHomeGalleryTiles(): Promise<GalleryTile[]> {
  const all = await getAllEventTiles();
  const supabase = createAdminClient();
  const { data: rows } = await supabase
    .from("homepage_gallery_selection")
    .select("image_key,position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (!rows || rows.length === 0) {
    return all.slice(0, HOME_LIMIT);
  }

  const byKey = new Map(all.map((t) => [t.key, t]));
  const out: GalleryTile[] = [];
  for (const r of rows) {
    const t = byKey.get(r.image_key);
    if (t) out.push(t);
    if (out.length >= HOME_LIMIT) break;
  }
  // Selection might reference deleted images — pad from the leftover
  // pool to keep the home dense.
  if (out.length < HOME_LIMIT) {
    const used = new Set(out.map((t) => t.key));
    for (const t of all) {
      if (used.has(t.key)) continue;
      out.push(t);
      if (out.length >= HOME_LIMIT) break;
    }
  }
  return out;
}

/** Set of keys currently selected for the home, used by the admin UI. */
export async function getHomeGallerySelectionSet(): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("homepage_gallery_selection")
    .select("image_key");
  return new Set((data ?? []).map((r) => r.image_key));
}
