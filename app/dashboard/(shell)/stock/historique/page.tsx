import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { HistoryTable, type HistoryRow } from "./HistoryTable";

type SP = Promise<{
  from?: string;
  to?: string;
  product?: string;
  direction?: string;
  source?: string;
}>;

/**
 * Full ledger of stock variations. Lives on its own route under the
 * Stock section so the main page stays light (Stock page only keeps
 * the latest 50 inline). Resolves product names and the originating
 * event in one round-trip so the client component can filter freely
 * without re-fetching.
 *
 * Default lookback: all movements, capped at 1000 rows — generous
 * enough to cover a full year at the current volume, cheap enough to
 * SSR on every load.
 */
export default async function StockHistoryPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { from, to, product, direction, source } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("stock_movements")
    .select(
      "id,product_id,qty,direction,reason,created_at,event_id,created_by",
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (from) q = q.gte("created_at", from);
  if (to) {
    // The user picks a date; we want it inclusive of that whole day in
    // the local timezone, so push the upper bound to the end of day.
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    q = q.lte("created_at", end.toISOString());
  }
  if (direction === "in" || direction === "out") {
    q = q.eq("direction", direction);
  }
  if (source === "manual") q = q.is("event_id", null);
  if (source === "event") q = q.not("event_id", "is", null);

  const { data: rows, error } = await q;

  const productIds = Array.from(
    new Set((rows ?? []).map((m) => m.product_id).filter(Boolean) as string[]),
  );
  const eventIds = Array.from(
    new Set(
      (rows ?? []).map((m) => m.event_id).filter((v): v is string => !!v),
    ),
  );

  const [{ data: products }, { data: events }] = await Promise.all([
    productIds.length
      ? supabase
          .from("products")
          .select("id,name,unit,category")
          .in("id", productIds)
      : Promise.resolve({ data: [] }),
    eventIds.length
      ? supabase
          .from("events")
          .select("id,title,date")
          .in("id", eventIds)
      : Promise.resolve({ data: [] }),
  ]);

  const productsById = new Map((products ?? []).map((p) => [p.id, p]));
  const eventsById = new Map((events ?? []).map((e) => [e.id, e]));

  const filteredByProduct = product
    ? (rows ?? []).filter((r) => {
        const p = productsById.get(r.product_id);
        if (!p) return false;
        return p.name.toLowerCase().includes(product.toLowerCase());
      })
    : (rows ?? []);

  const enriched: HistoryRow[] = filteredByProduct.map((m) => {
    const p = productsById.get(m.product_id);
    const e = m.event_id ? eventsById.get(m.event_id) : null;
    return {
      id: m.id,
      created_at: m.created_at,
      direction: m.direction as "in" | "out",
      qty: Number(m.qty ?? 0),
      reason: m.reason,
      productId: m.product_id,
      productName: p?.name ?? "—",
      productUnit: p?.unit ?? null,
      productCategory: p?.category ?? null,
      eventId: m.event_id,
      eventTitle: e?.title ?? null,
      eventDate: e?.date ?? null,
    };
  });

  // Pre-computed aggregate counts so the filter pills can show totals
  // without re-walking the array on every render in the client.
  const counts = {
    total: enriched.length,
    in: enriched.filter((r) => r.direction === "in").length,
    out: enriched.filter((r) => r.direction === "out").length,
  };

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pilotage · Stock
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
              Variations de stock
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Historique complet des entrées et sorties. Inclut les
              ajustements manuels et les sorties automatiques générées par
              la clôture d&apos;événement.
            </p>
          </div>
          <Link
            href="/dashboard/stock"
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white dark:shadow-none"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au stock
          </Link>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
            {error.message}
          </div>
        )}

        <HistoryTable
          rows={enriched}
          counts={counts}
          initial={{ from, to, product, direction, source }}
        />
      </div>
    </div>
  );
}
