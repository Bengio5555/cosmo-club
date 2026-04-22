import { createClient } from "@/lib/supabase/server";
import { CatalogManager } from "./CatalogManager";

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("archived", false)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Catalogue de prestations</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Ta bibliothèque de prestations pré-remplies. Utilisée dans l&apos;éditeur
          de devis en 1 clic. Éditer un item ici ne modifie pas les devis déjà
          émis (copie figée à la création).
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <CatalogManager initial={items ?? []} />
    </div>
  );
}
