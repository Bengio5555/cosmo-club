// Coût de revient matière d'une recette, à partir des lignes
// cocktail_ingredients et des produits stock. Pure module : partagé
// entre la liste des boissons et, plus tard, la fiche recette.
//
// Convention reprise de computeCoursesData : la quantité d'un
// ingrédient est exprimée dans le « contenu » du produit (cl pour une
// bouteille) quand content_per_unit est renseigné, sinon dans l'unité
// brute du produit (pièce, sachet…). Le prix d'achat cost_ht porte sur
// une unité brute, d'où la division par content_per_unit.

export type RecipeCostProduct = {
  id: string;
  cost_ht: number | null;
  content_per_unit: number | null;
};

export type RecipeCostIngredient = {
  cocktail_id: string;
  product_id: string;
  qty: number;
};

export type RecipeCost = {
  /** Coût HT des ingrédients dont le prix est connu, arrondi au centime. */
  ht: number;
  /** false dès qu'un ingrédient n'a pas de prix d'achat ou de produit. */
  complete: boolean;
};

export function computeRecipeCosts(
  ingredients: RecipeCostIngredient[],
  products: RecipeCostProduct[],
): Record<string, RecipeCost> {
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: Record<string, RecipeCost> = {};
  for (const ing of ingredients) {
    const entry = (out[ing.cocktail_id] ??= { ht: 0, complete: true });
    const p = byId.get(ing.product_id);
    const costHt = p?.cost_ht != null ? Number(p.cost_ht) : null;
    if (!p || costHt == null) {
      entry.complete = false;
      continue;
    }
    const perUnit = p.content_per_unit ? Number(p.content_per_unit) : null;
    const divisor = perUnit && perUnit > 0 ? perUnit : 1;
    entry.ht += (costHt * Number(ing.qty ?? 0)) / divisor;
  }
  for (const c of Object.values(out)) c.ht = Math.round(c.ht * 100) / 100;
  return out;
}
