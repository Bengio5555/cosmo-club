import { createClient } from "@/lib/supabase/server";
import { StockTable } from "./StockTable";

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data: products, error }, { data: movements }] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .order("archived", { ascending: true })
      .order("category", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("stock_movements")
      .select("id,product_id,qty,direction,reason,created_at,event_id")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">Stock</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Inventaire spiritueux, sirops, garnitures, verrerie, consommables.
          Alertes quand stock &lt; seuil. Les clôtures d&apos;événement génèrent
          automatiquement des mouvements OUT.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {error.message}
        </div>
      )}

      <StockTable products={products ?? []} movements={movements ?? []} />
    </div>
  );
}
