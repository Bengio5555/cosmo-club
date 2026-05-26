import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Default skeleton of line items that every freshly-created quote
 * starts with. Order matters — it's the order they appear in the
 * editor and on the public plaquette. The operator then tweaks
 * quantities and removes lines that don't apply per event.
 *
 * Each title MUST match a catalog_items.title exactly (case-insensitive
 * comparison done by the seeder). Items missing from the catalog are
 * skipped silently — better than failing the quote creation.
 */
export const QUOTE_PRESET_TITLES = [
  'Cocktails gamme "Cosmo"',
  "Shots fruités & classiques",
  "Matériel mixologue",
  "Verrerie & Assurance",
  "Shots en plastique",
  "Glaçons 20 kg : cubes ou glace pilée",
  "Gestion des déchets",
  "Bar Miroir 4 Bay (2m60)",
  "Compositions florales stabilisées",
  "Création & impression(s) menu(s) personnalisé(s)",
  "Barman",
  "Commis",
  "Livraison, manutention et reprise — Paris",
  "Repas staff",
] as const;

/**
 * Seed a freshly-created quote with the preset line items. Returns
 * the number of rows actually inserted (≤ QUOTE_PRESET_TITLES.length —
 * any catalog item missing from the DB is simply skipped).
 *
 * Called from createQuoteForClient and convertLeadToQuote; NOT called
 * from duplicateQuote (which inherits its own items from the source).
 *
 * qty defaults to 1 for every line. The operator adjusts per-guest
 * quantities (cocktails, repas staff) right after opening the editor.
 */
export async function seedQuotePresetItems(
  supabase: SupabaseClient<Database>,
  quoteId: string,
): Promise<number> {
  const { data: catalog, error } = await supabase
    .from("catalog_items")
    .select("title,description,section,unit,unit_price_ht")
    .in("title", QUOTE_PRESET_TITLES as unknown as string[])
    .eq("archived", false);
  if (error || !catalog || catalog.length === 0) return 0;

  // Build a lookup so we can preserve the canonical order even if
  // Postgres returned rows in a different order.
  const byTitle = new Map(
    catalog.map((c) => [c.title.toLowerCase(), c]),
  );

  const rows = QUOTE_PRESET_TITLES.map((title, position) => {
    const c = byTitle.get(title.toLowerCase());
    if (!c) return null;
    return {
      quote_id: quoteId,
      position,
      section: c.section,
      title: c.title,
      description: c.description,
      qty: 1,
      unit: c.unit,
      unit_price_ht: c.unit_price_ht,
      discount_ht: 0,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null);

  if (rows.length === 0) return 0;

  const { error: insErr } = await supabase.from("quote_items").insert(rows);
  if (insErr) {
    console.error(
      "[seedQuotePresetItems] insert failed for quote",
      quoteId,
      insErr.message,
    );
    return 0;
  }
  return rows.length;
}
