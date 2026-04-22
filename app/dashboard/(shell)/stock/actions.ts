"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database, TablesUpdate } from "@/types/database";

type ProductCategory = Database["public"]["Enums"]["product_category"];
type ProductUpdate = TablesUpdate<"products">;

export type ProductInput = {
  name: string;
  category: ProductCategory;
  unit: string;
  stock_qty: number;
  min_threshold: number;
  cost_ht: number | null;
  supplier: string | null;
  notes: string | null;
  /** For liquids: how many `content_unit` per stock unit (e.g. 70 for a 70cl bottle). */
  content_per_unit: number | null;
  /** Physical content unit: "cl" | "g" | "pc" — drives the cocktail recipe autocalc. */
  content_unit: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

export async function saveNewProduct(input: ProductInput) {
  const supabase = await createClient();
  if (!input.name.trim()) {
    return { ok: false as const, error: "Nom requis." };
  }
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name.trim(),
      category: input.category,
      unit: input.unit.trim() || "unité",
      stock_qty: Number(input.stock_qty) || 0,
      min_threshold: Number(input.min_threshold) || 0,
      cost_ht:
        input.cost_ht == null || !Number.isFinite(Number(input.cost_ht))
          ? null
          : Number(input.cost_ht),
      supplier: clean(input.supplier),
      notes: clean(input.notes),
      content_per_unit:
        input.content_per_unit == null ||
        !Number.isFinite(Number(input.content_per_unit))
          ? null
          : Number(input.content_per_unit),
      content_unit: clean(input.content_unit),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Création échouée" };
  }
  revalidatePath("/dashboard/stock");
  return { ok: true as const, id: data.id };
}

export async function saveProduct(id: string, input: Partial<ProductInput>) {
  const supabase = await createClient();
  const patch: ProductUpdate = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.category !== undefined) patch.category = input.category;
  if (input.unit !== undefined) patch.unit = input.unit.trim() || "unité";
  if (input.stock_qty !== undefined) patch.stock_qty = Number(input.stock_qty) || 0;
  if (input.min_threshold !== undefined)
    patch.min_threshold = Number(input.min_threshold) || 0;
  if (input.cost_ht !== undefined)
    patch.cost_ht =
      input.cost_ht == null || !Number.isFinite(Number(input.cost_ht))
        ? null
        : Number(input.cost_ht);
  if (input.supplier !== undefined) patch.supplier = clean(input.supplier);
  if (input.notes !== undefined) patch.notes = clean(input.notes);
  if (input.content_per_unit !== undefined)
    patch.content_per_unit =
      input.content_per_unit == null ||
      !Number.isFinite(Number(input.content_per_unit))
        ? null
        : Number(input.content_per_unit);
  if (input.content_unit !== undefined)
    patch.content_unit = clean(input.content_unit);

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/stock");
  return { ok: true as const };
}

export async function toggleProductArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ archived })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/stock");
  return { ok: true as const };
}

/**
 * Manual stock adjustment: in (restock / inventory correction upward) or
 * out (breakage / tasting / manual consumption). Writes a stock_movements
 * row and bumps products.stock_qty atomically. Ties by reason so the
 * owner has traceability (aide à distinguer d'un mouvement
 * auto-généré par closeEvent plus tard).
 */
export async function adjustStock(
  productId: string,
  qty: number,
  direction: "in" | "out",
  reason: string | null,
) {
  if (!Number.isFinite(qty) || qty <= 0) {
    return { ok: false as const, error: "Quantité invalide." };
  }
  const supabase = await createClient();
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id,stock_qty")
    .eq("id", productId)
    .maybeSingle();
  if (pErr || !product) {
    return { ok: false as const, error: pErr?.message ?? "Produit introuvable" };
  }
  const nextQty =
    direction === "in"
      ? Number(product.stock_qty) + qty
      : Math.max(0, Number(product.stock_qty) - qty);

  const { error: mvErr } = await supabase.from("stock_movements").insert({
    product_id: productId,
    qty,
    direction,
    reason: clean(reason),
  });
  if (mvErr) return { ok: false as const, error: mvErr.message };

  const { error: upErr } = await supabase
    .from("products")
    .update({ stock_qty: nextQty })
    .eq("id", productId);
  if (upErr) return { ok: false as const, error: upErr.message };

  revalidatePath("/dashboard/stock");
  revalidatePath("/dashboard");
  return { ok: true as const, newQty: nextQty };
}
