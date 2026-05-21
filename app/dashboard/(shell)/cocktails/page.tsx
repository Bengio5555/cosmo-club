import Link from "next/link";
import { Wine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NewCocktailButton } from "./NewCocktailButton";

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
  const ingredientCount = new Map<string, number>();
  for (const ing of ingredients ?? []) {
    ingredientCount.set(
      ing.cocktail_id,
      (ingredientCount.get(ing.cocktail_id) ?? 0) + 1,
    );
  }

  // Group by category for display
  const active = (cocktails ?? []).filter((c) => !c.archived);
  const archived = (cocktails ?? []).filter((c) => c.archived);
  const byCategory = new Map<string, typeof active>();
  for (const c of active) {
    const cat = c.category || "— Sans catégorie";
    const arr = byCategory.get(cat) ?? [];
    arr.push(c);
    byCategory.set(cat, arr);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
            Cocktails
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

      {(!cocktails || cocktails.length === 0) && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-10 text-center text-sm text-slate-500 dark:text-slate-500">
          <Wine className="h-6 w-6 text-slate-700" />
          <p>Aucune recette pour l&apos;instant.</p>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Ajoute tes cocktails signature pour débloquer le calcul automatique
            de stock sur la fiche événement.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {Array.from(byCategory.entries()).map(([cat, list]) => (
          <section
            key={cat}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
          >
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {cat}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {list.map((c) => {
                const count = ingredientCount.get(c.id) ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/cocktails/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {c.name}
                        </p>
                        {c.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">
                            {c.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-[11px] ${count === 0 ? "text-amber-400/70" : "text-slate-500 dark:text-slate-500"}`}
                      >
                        {count} ingrédient{count > 1 ? "s" : ""}
                        {count === 0 && " · à compléter"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        {archived.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
            <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 hover:text-neutral-300">
              Archivées · {archived.length}
            </summary>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {archived.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/cocktails/${c.id}`}
                    className="flex items-center gap-3 px-4 py-2 text-sm text-slate-500 dark:text-slate-500 opacity-70 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-neutral-300"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
