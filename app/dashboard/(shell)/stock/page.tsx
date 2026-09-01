import Link from "next/link";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StockTable } from "./StockTable";

export default async function StockPage() {
  const supabase = await createClient();
  const [{ data: products, error }, { data: movements }, { data: openEvents }] =
    await Promise.all([
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
      // Reservations only bite while an event is still open: closing one
      // converts its reservation into a real OUT movement, and cancelled
      // events release theirs.
      supabase.from("events").select("id").in("status", ["a_venir", "en_cours"]),
    ]);

  // products.stock_qty is what physically sits in the storeroom — a
  // reservation never touches it, it only lands in event_stock. Without
  // this aggregate the page shows the same bottles as available to every
  // upcoming event at once, which is how stock gets over-committed.
  const openIds = (openEvents ?? []).map((e) => e.id);
  const { data: reservations } = openIds.length
    ? await supabase
        .from("event_stock")
        .select("product_id,qty_reserved")
        .in("event_id", openIds)
    : { data: [] };

  const reserved: Record<string, number> = {};
  for (const r of reservations ?? []) {
    if (!r.product_id) continue;
    reserved[r.product_id] =
      (reserved[r.product_id] ?? 0) + Number(r.qty_reserved ?? 0);
  }

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Stock
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Inventaire spiritueux, sirops, garnitures, verrerie, consommables.
            Alertes quand stock &lt; seuil. « Réservé » = engagé sur les événements
            à venir ; « dispo » = ce qu&apos;il reste vraiment à promettre.
          </p>
        </div>
        <Link
          href="/dashboard/stock/historique"
          className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
        >
          <History className="h-3.5 w-3.5" />
          Variations de stock
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <StockTable
        products={products ?? []}
        movements={movements ?? []}
        reserved={reserved}
      />
    </div>
  );
}
