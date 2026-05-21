import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CocktailEditor } from "./CocktailEditor";

type Params = Promise<{ id: string }>;

export default async function CocktailDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: cocktail }, { data: ingredients }, { data: products }] =
    await Promise.all([
      supabase.from("cocktails").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("cocktail_ingredients")
        .select("*")
        .eq("cocktail_id", id)
        .order("position", { ascending: true }),
      supabase
        .from("products")
        .select(
          "id,name,category,unit,content_per_unit,content_unit,archived",
        )
        .eq("archived", false)
        .order("category")
        .order("name"),
    ]);

  if (!cocktail) {
    notFound();
  }

  return (
    <>
      <div className="border-b border-slate-100 dark:border-neutral-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/cocktails"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-neutral-400 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Toutes les recettes
        </Link>
      </div>

      <CocktailEditor
        cocktail={cocktail}
        initialIngredients={ingredients ?? []}
        productOptions={products ?? []}
      />
    </>
  );
}
