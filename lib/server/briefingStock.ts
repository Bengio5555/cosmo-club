import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ReservedLine = {
  product_id: string;
  name: string;
  category: string; // human label, e.g. "Spiritueux"
  qty: number;
  unit: string;
};

type Category = Database["public"]["Enums"]["product_category"];

// Print order follows how the team packs: bottles first, then syrups,
// garnishes, consumables, glassware, and tech gear last.
const ORDER: Category[] = ["spiritueux", "sirops", "garnitures", "consommables", "verrerie", "tech"];
const LABEL: Record<Category, string> = {
  spiritueux: "Spiritueux",
  sirops: "Sirops & purées",
  garnitures: "Garnitures",
  consommables: "Consommables",
  verrerie: "Verrerie",
  tech: "Tech",
};

/**
 * The event's reserved stock, resolved to product names and ordered for
 * the staff briefing. Read live from event_stock rather than copied into
 * briefing_data: a copy would go stale the moment a reservation changes,
 * and the whole point is that nobody re-types this list.
 *
 * Works with either client (admin for the token-gated public page, the
 * cookie client for the dashboard editor). Plain .in() + in-memory join,
 * matching the rest of the briefing loaders.
 */
export async function loadReservedStock(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<ReservedLine[]> {
  const { data: rows } = await supabase
    .from("event_stock")
    .select("product_id,qty_reserved")
    .eq("event_id", eventId);
  const ids = Array.from(
    new Set((rows ?? []).map((r) => r.product_id).filter((v): v is string => !!v)),
  );
  if (ids.length === 0) return [];
  const { data: products } = await supabase
    .from("products")
    .select("id,name,category,unit")
    .in("id", ids);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  const lines: ReservedLine[] = [];
  for (const r of rows ?? []) {
    const p = r.product_id ? byId.get(r.product_id) : null;
    const qty = Number(r.qty_reserved ?? 0);
    if (!p || qty <= 0) continue;
    lines.push({
      product_id: p.id,
      name: p.name,
      category: LABEL[p.category as Category] ?? p.category,
      qty,
      unit: p.unit,
    });
  }
  const rank = (label: string) => {
    const i = ORDER.findIndex((c) => LABEL[c] === label);
    return i === -1 ? ORDER.length : i;
  };
  return lines.sort(
    (a, b) => rank(a.category) - rank(b.category) || a.name.localeCompare(b.name, "fr"),
  );
}
