"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CocktailInput = {
  name: string;
  description: string | null;
  category: string | null;
};

export type IngredientInput = {
  product_id: string;
  qty: number;
  position: number;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

export async function saveNewCocktail(input: CocktailInput) {
  const supabase = await createClient();
  if (!input.name.trim()) {
    return { ok: false as const, error: "Nom requis." };
  }
  const { data, error } = await supabase
    .from("cocktails")
    .insert({
      name: input.name.trim(),
      description: clean(input.description),
      category: clean(input.category),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Création échouée" };
  }
  revalidatePath("/dashboard/cocktails");
  return { ok: true as const, id: data.id };
}

export async function saveCocktail(id: string, input: Partial<CocktailInput>) {
  const supabase = await createClient();
  const patch: Partial<{ name: string; description: string | null; category: string | null }> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = clean(input.description);
  if (input.category !== undefined) patch.category = clean(input.category);

  const { error } = await supabase.from("cocktails").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/cocktails/${id}`);
  revalidatePath("/dashboard/cocktails");
  return { ok: true as const };
}

export async function toggleCocktailArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("cocktails")
    .update({ archived })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/cocktails");
  return { ok: true as const };
}

export async function deleteCocktail(id: string) {
  const supabase = await createClient();
  // Guard: refuse if referenced by any event_cocktails (history integrity).
  const { count } = await supabase
    .from("event_cocktails")
    .select("*", { count: "exact", head: true })
    .eq("cocktail_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error: `Recette liée à ${count} événement(s). Archive-la plutôt.`,
    };
  }
  const { error } = await supabase.from("cocktails").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/cocktails");
  return { ok: true as const };
}

/**
 * Replace the full ingredient list of a cocktail in one go. Delete existing
 * rows that aren't in the new payload, upsert the rest. Matches the
 * reconciliation pattern used for quote/invoice items.
 */
export async function saveCocktailIngredients(
  cocktailId: string,
  ingredients: IngredientInput[],
) {
  const supabase = await createClient();

  // Dedup by product_id (composite PK), keeping the last one to let the UI
  // consolidate duplicates silently.
  const byProduct = new Map<string, IngredientInput>();
  for (const ing of ingredients) {
    if (!ing.product_id || !Number.isFinite(ing.qty) || ing.qty < 0) continue;
    byProduct.set(ing.product_id, ing);
  }
  const clean = Array.from(byProduct.values());

  // Fetch existing to compute delete-set
  const { data: existing } = await supabase
    .from("cocktail_ingredients")
    .select("product_id")
    .eq("cocktail_id", cocktailId);
  const keptIds = new Set(clean.map((c) => c.product_id));
  const toDelete = (existing ?? [])
    .map((r) => r.product_id)
    .filter((pid) => !keptIds.has(pid));

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("cocktail_ingredients")
      .delete()
      .eq("cocktail_id", cocktailId)
      .in("product_id", toDelete);
    if (error) return { ok: false as const, error: error.message };
  }

  if (clean.length > 0) {
    const { error } = await supabase.from("cocktail_ingredients").upsert(
      clean.map((c) => ({
        cocktail_id: cocktailId,
        product_id: c.product_id,
        qty: c.qty,
        position: c.position,
      })),
      { onConflict: "cocktail_id,product_id" },
    );
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath(`/dashboard/cocktails/${cocktailId}`);
  return { ok: true as const };
}
