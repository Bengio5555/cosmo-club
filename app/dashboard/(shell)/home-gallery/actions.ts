"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const HOME_LIMIT = 8;

/**
 * Toggle one image's presence in the home gallery selection. When
 * adding, the new entry is appended at the end of the order. When
 * removing, the row is deleted (subsequent positions are NOT
 * renumbered — the order stays stable for the remaining items, the
 * homepage reader handles gaps fine).
 *
 * Refuses to add beyond HOME_LIMIT so the user can't accidentally
 * blow past the cap from the admin grid.
 */
export async function toggleHomeGalleryImage(imageKey: string) {
  if (!imageKey) return { ok: false as const, error: "Clé image invalide." };
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("homepage_gallery_selection")
    .select("image_key")
    .eq("image_key", imageKey)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("homepage_gallery_selection")
      .delete()
      .eq("image_key", imageKey);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/dashboard/home-gallery");
    revalidatePath("/");
    return { ok: true as const, selected: false };
  }

  const { count } = await supabase
    .from("homepage_gallery_selection")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) >= HOME_LIMIT) {
    return {
      ok: false as const,
      error: `${HOME_LIMIT} images max sur la home — désélectionne d'abord.`,
    };
  }

  const { data: maxRow } = await supabase
    .from("homepage_gallery_selection")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (maxRow?.position ?? -1) + 1;

  const { error } = await supabase
    .from("homepage_gallery_selection")
    .insert({ image_key: imageKey, position: nextPosition });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/home-gallery");
  revalidatePath("/");
  return { ok: true as const, selected: true };
}

/**
 * Move a selected image up or down in the home order. Operates on a
 * dense renumbering of the current selection so we never end up with
 * gaps or duplicates.
 */
export async function moveHomeGalleryImage(
  imageKey: string,
  direction: "up" | "down",
) {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("homepage_gallery_selection")
    .select("image_key,position")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (!rows) return { ok: false as const, error: "Aucune ligne." };

  const idx = rows.findIndex((r) => r.image_key === imageKey);
  if (idx < 0)
    return { ok: false as const, error: "Image non sélectionnée." };
  const swap = direction === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= rows.length) return { ok: true as const };

  const dense = rows.map((r, i) => ({ image_key: r.image_key, position: i }));
  const a = dense[idx];
  const b = dense[swap];
  dense[idx] = { image_key: a.image_key, position: b.position };
  dense[swap] = { image_key: b.image_key, position: a.position };

  for (const r of dense) {
    await supabase
      .from("homepage_gallery_selection")
      .update({ position: r.position })
      .eq("image_key", r.image_key);
  }

  revalidatePath("/dashboard/home-gallery");
  revalidatePath("/");
  return { ok: true as const };
}
