import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type CoursesMode = "shortage" | "full";

export type CoursesLine = {
  productId: string;
  productName: string;
  category: string;
  supplier: string;
  unit: string;
  contentUnit: string;
  perUnit: number | null;
  packsNeeded: number;
  stockQty: number;
  toBuy: number;
  costPerPack: number | null;
  lineCost: number | null;
};

export type CoursesGroup = {
  name: string;
  lines: CoursesLine[];
  subtotal: number;
};

export type CoursesData = {
  event: {
    id: string;
    title: string;
    date: string | null;
    location: string | null;
    guests_count: number | null;
  };
  clientName: string | null;
  menuLines: { name: string; qty: number }[];
  totalCocktails: number;
  supplierGroups: CoursesGroup[];
  grandTotal: number;
  mode: CoursesMode;
  missingMenu: boolean;
};

/**
 * Shared compute for the shopping list — returns an already-grouped and
 * sorted payload ready to feed both the printable HTML page and the
 * server-generated PDF.
 *
 * The computation:
 *   1. Aggregate ingredient needs per product = Σ (qty × qty_planned)
 *   2. For each product, ceil(need / content_per_unit) → packs needed
 *   3. In shortage mode (default), subtract stock_qty, clamp to ≥0
 *   4. Group by supplier, sort alphabetically, compute subtotals
 */
export async function computeCoursesData(
  supabase: SupabaseClient<Database>,
  eventId: string,
  mode: CoursesMode,
): Promise<CoursesData | null> {
  const { data: event } = await supabase
    .from("events")
    .select("id,title,date,location,guests_count,client_id")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) return null;

  const showOnlyShortage = mode === "shortage";

  const [{ data: client }, { data: menu }, { data: allProducts }] =
    await Promise.all([
      event.client_id
        ? supabase
            .from("clients")
            .select("first_name,last_name,company_name,email")
            .eq("id", event.client_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("event_cocktails")
        .select("cocktail_id,qty_planned")
        .eq("event_id", eventId),
      supabase
        .from("products")
        .select(
          "id,name,category,unit,stock_qty,content_per_unit,content_unit,cost_ht,supplier,archived",
        )
        .eq("archived", false),
    ]);

  const cocktailIds = (menu ?? []).map((m) => m.cocktail_id);
  const [{ data: cocktailRows }, { data: ingredients }] = await Promise.all([
    cocktailIds.length
      ? supabase.from("cocktails").select("id,name").in("id", cocktailIds)
      : Promise.resolve({ data: [] }),
    cocktailIds.length
      ? supabase
          .from("cocktail_ingredients")
          .select("cocktail_id,product_id,qty")
          .in("cocktail_id", cocktailIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productsById = new Map((allProducts ?? []).map((p) => [p.id, p]));
  const cocktailQty = new Map(
    (menu ?? []).map((m) => [m.cocktail_id, m.qty_planned]),
  );
  const totalNeed = new Map<string, number>();
  for (const ing of ingredients ?? []) {
    const planned = cocktailQty.get(ing.cocktail_id) ?? 0;
    if (!planned) continue;
    totalNeed.set(
      ing.product_id,
      (totalNeed.get(ing.product_id) ?? 0) + Number(ing.qty) * planned,
    );
  }

  const lines: CoursesLine[] = [];
  for (const [productId, need] of totalNeed.entries()) {
    const p = productsById.get(productId);
    if (!p) continue;
    const perUnit = p.content_per_unit ? Number(p.content_per_unit) : null;
    const packsNeeded =
      perUnit && perUnit > 0 ? Math.ceil(need / perUnit) : Math.ceil(need);
    const stockQty = Number(p.stock_qty ?? 0);
    const toBuy = showOnlyShortage
      ? Math.max(0, packsNeeded - stockQty)
      : packsNeeded;
    if (toBuy <= 0) continue;
    const costHt = p.cost_ht != null ? Number(p.cost_ht) : null;
    const lineCost =
      costHt != null ? Math.round(costHt * toBuy * 100) / 100 : null;
    lines.push({
      productId,
      productName: p.name,
      category: p.category,
      supplier: p.supplier || "— Sans fournisseur",
      unit: p.unit,
      contentUnit: p.content_unit ?? p.unit,
      perUnit,
      packsNeeded,
      stockQty,
      toBuy,
      costPerPack: costHt,
      lineCost,
    });
  }

  const bySupplier = new Map<string, CoursesLine[]>();
  for (const l of lines) {
    const arr = bySupplier.get(l.supplier) ?? [];
    arr.push(l);
    bySupplier.set(l.supplier, arr);
  }
  const supplierGroups: CoursesGroup[] = Array.from(bySupplier.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, list]) => ({
      name,
      lines: list.sort((a, b) =>
        (a.category + a.productName).localeCompare(
          b.category + b.productName,
        ),
      ),
      subtotal: list.reduce((s, l) => s + (l.lineCost ?? 0), 0),
    }));

  const grandTotal = supplierGroups.reduce((s, g) => s + g.subtotal, 0);

  const cocktailNameById = new Map(
    (cocktailRows ?? []).map((c) => [c.id, c.name]),
  );
  const menuLines = (menu ?? [])
    .map((m) => ({
      name: cocktailNameById.get(m.cocktail_id) ?? "—",
      qty: m.qty_planned,
    }))
    .sort((a, b) => b.qty - a.qty);
  const totalCocktails = menuLines.reduce((s, m) => s + m.qty, 0);

  const clientName =
    client?.company_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.email ||
    null;

  return {
    event,
    clientName,
    menuLines,
    totalCocktails,
    supplierGroups,
    grandTotal,
    mode,
    missingMenu: totalNeed.size === 0,
  };
}
