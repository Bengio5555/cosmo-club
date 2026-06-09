import { createClient } from "@/lib/supabase/server";
import { NewCocktailButton } from "./NewCocktailButton";
import { CocktailsBrowser, type CocktailRow } from "./CocktailsBrowser";

export default async function CocktailsListPage() {
  const supabase = await createClient();

  const { data: cocktails, error } = await supabase
    .from("cocktails")
    .select("id,name,description,category,archived,updated_at")
    .order("archived", { ascending: true })
    .order("category", { ascending: true, nullsFirst: false })
    .order("name", { ascending: true });

  // Count ingredients per cocktail in one round-trip.
  const cocktailIds = (cocktails ?? []).map((c) => c.id);
  const { data: ingredients } = cocktailIds.length
    ? await supabase
        .from("cocktail_ingredients")
        .select("cocktail_id")
        .in("cocktail_id", cocktailIds)
    : { data: [] };
  const ingredientCount: Record<string, number> = {};
  for (const ing of ingredients ?? []) {
    ingredientCount[ing.cocktail_id] = (ingredientCount[ing.cocktail_id] ?? 0) + 1;
  }

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Boissons
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Recettes réutilisables. Liées à tes produits stock → calcul
            automatique du stock nécessaire par événement.
          </p>
        </div>
        <NewCocktailButton />
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <CocktailsBrowser
        cocktails={(cocktails ?? []) as CocktailRow[]}
        ingredientCount={ingredientCount}
      />
    </div>
  );
}
