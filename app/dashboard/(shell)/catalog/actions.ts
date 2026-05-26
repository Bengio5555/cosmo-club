"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type CatalogInput = {
  title: string;
  title_en?: string | null;
  description?: string | null;
  description_en?: string | null;
  section?: string | null;
  section_en?: string | null;
  unit?: string | null;
  unit_price_ht: number;
  sort_order?: number;
};

function cleanOptional(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

export async function createCatalogItem(input: CatalogInput) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("catalog_items")
    .insert({
      title: input.title.trim(),
      title_en: cleanOptional(input.title_en),
      description: cleanOptional(input.description),
      description_en: cleanOptional(input.description_en),
      section: cleanOptional(input.section),
      section_en: cleanOptional(input.section_en),
      unit: input.unit?.trim() || "unité",
      unit_price_ht: input.unit_price_ht,
      sort_order: input.sort_order ?? 0,
    });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/catalog");
  return { ok: true as const };
}

export async function updateCatalogItem(id: string, patch: Partial<CatalogInput> & { archived?: boolean }) {
  const supabase = await createClient();
  const db: Database["public"]["Tables"]["catalog_items"]["Update"] = {};
  if (patch.title != null) db.title = patch.title.trim();
  if ("title_en" in patch) db.title_en = cleanOptional(patch.title_en);
  if ("description" in patch) db.description = cleanOptional(patch.description);
  if ("description_en" in patch)
    db.description_en = cleanOptional(patch.description_en);
  if ("section" in patch) db.section = cleanOptional(patch.section);
  if ("section_en" in patch) db.section_en = cleanOptional(patch.section_en);
  if ("unit" in patch) db.unit = patch.unit?.trim() || "unité";
  if (patch.unit_price_ht != null) db.unit_price_ht = patch.unit_price_ht;
  if (patch.sort_order != null) db.sort_order = patch.sort_order;
  if (patch.archived != null) db.archived = patch.archived;

  const { error } = await supabase.from("catalog_items").update(db).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/catalog");
  return { ok: true as const };
}

export async function deleteCatalogItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/catalog");
  return { ok: true as const };
}
