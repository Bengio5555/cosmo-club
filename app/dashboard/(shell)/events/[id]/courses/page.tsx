import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateFR, formatEUR } from "@/lib/format";
import { PrintButton } from "./PrintButton";
import "./courses.css";

type Params = Promise<{ id: string }>;
type SP = Promise<{ mode?: string }>;

/**
 * Shopping list for an event. Computes the same ingredient aggregation
 * as the MenuSection modal, but presents it as a print-ready A4 page
 * grouped by supplier — the owner can print it or "Save as PDF" from
 * the browser dialog to take it to Métro / Rungis.
 *
 * By default, shows only what's MISSING from stock (mode=shortage).
 * `?mode=full` switches to showing everything needed (for a full
 * re-stock exercise).
 */
export default async function CoursesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SP;
}) {
  const { id } = await params;
  const { mode } = await searchParams;
  const showOnlyShortage = mode !== "full";

  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("id,title,date,location,guests_count,client_id")
    .eq("id", id)
    .maybeSingle();

  if (!event) notFound();

  const [
    { data: client },
    { data: menu },
    { data: allProducts },
  ] = await Promise.all([
    event.client_id
      ? supabase
          .from("clients")
          .select("first_name,last_name,company_name,email")
          .eq("id", event.client_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("event_cocktails")
      .select("cocktail_id,qty_planned")
      .eq("event_id", id),
    supabase
      .from("products")
      .select(
        "id,name,category,unit,stock_qty,content_per_unit,content_unit,cost_ht,supplier,archived",
      )
      .eq("archived", false),
  ]);

  // Cocktail names for the menu summary.
  const cocktailIds = (menu ?? []).map((m) => m.cocktail_id);
  const [{ data: cocktailRows }, { data: ingredients }] = await Promise.all([
    cocktailIds.length
      ? supabase
          .from("cocktails")
          .select("id,name")
          .in("id", cocktailIds)
      : Promise.resolve({ data: [] }),
    cocktailIds.length
      ? supabase
          .from("cocktail_ingredients")
          .select("cocktail_id,product_id,qty")
          .in("cocktail_id", cocktailIds)
      : Promise.resolve({ data: [] }),
  ]);

  // ─── Aggregate needs ─────────────────────────────────────────
  const productsById = new Map((allProducts ?? []).map((p) => [p.id, p]));
  const cocktailQty = new Map(
    (menu ?? []).map((m) => [m.cocktail_id, m.qty_planned]),
  );
  const totalNeed = new Map<string, number>();
  for (const ing of ingredients ?? []) {
    const planned = cocktailQty.get(ing.cocktail_id) ?? 0;
    if (!planned) continue;
    totalNeed.set(
      ing.product_id,
      (totalNeed.get(ing.product_id) ?? 0) + Number(ing.qty) * planned,
    );
  }

  // ─── Explode to pack rows, filter by mode ────────────────────
  type Line = {
    productId: string;
    productName: string;
    category: string;
    supplier: string;
    unit: string;
    contentUnit: string;
    perUnit: number | null;
    packsNeeded: number;
    stockQty: number;
    toBuy: number; // qty to purchase (need − stock, min 0)
    costPerPack: number | null;
    lineCost: number | null;
  };

  const lines: Line[] = [];
  for (const [productId, need] of totalNeed.entries()) {
    const p = productsById.get(productId);
    if (!p) continue;
    const perUnit = p.content_per_unit ? Number(p.content_per_unit) : null;
    const packsNeeded =
      perUnit && perUnit > 0 ? Math.ceil(need / perUnit) : Math.ceil(need);
    const stockQty = Number(p.stock_qty ?? 0);
    const toBuy = showOnlyShortage
      ? Math.max(0, packsNeeded - stockQty)
      : packsNeeded;
    if (toBuy <= 0) continue;
    const costHt = p.cost_ht != null ? Number(p.cost_ht) : null;
    const lineCost = costHt != null ? Math.round(costHt * toBuy * 100) / 100 : null;
    lines.push({
      productId,
      productName: p.name,
      category: p.category,
      supplier: p.supplier || "— Sans fournisseur",
      unit: p.unit,
      contentUnit: p.content_unit ?? p.unit,
      perUnit,
      packsNeeded,
      stockQty,
      toBuy,
      costPerPack: costHt,
      lineCost,
    });
  }

  // ─── Group by supplier ───────────────────────────────────────
  const bySupplier = new Map<string, Line[]>();
  for (const l of lines) {
    const arr = bySupplier.get(l.supplier) ?? [];
    arr.push(l);
    bySupplier.set(l.supplier, arr);
  }
  // Sort suppliers alphabetically, lines within each by category then name
  const supplierGroups = Array.from(bySupplier.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, list]) => ({
      name,
      lines: list.sort(
        (a, b) =>
          (a.category + a.productName).localeCompare(b.category + b.productName),
      ),
      subtotal: list.reduce((s, l) => s + (l.lineCost ?? 0), 0),
    }));

  const grandTotal = supplierGroups.reduce((s, g) => s + g.subtotal, 0);

  // ─── Menu summary ────────────────────────────────────────────
  const cocktailNameById = new Map((cocktailRows ?? []).map((c) => [c.id, c.name]));
  const menuLines = (menu ?? [])
    .map((m) => ({
      name: cocktailNameById.get(m.cocktail_id) ?? "—",
      qty: m.qty_planned,
    }))
    .sort((a, b) => b.qty - a.qty);
  const totalCocktails = menuLines.reduce((s, m) => s + m.qty, 0);

  // Client display name
  const clientName =
    client?.company_name ||
    [client?.first_name, client?.last_name].filter(Boolean).join(" ") ||
    client?.email ||
    null;

  return (
    <div className="courses-body bg-neutral-900">
      <div className="courses-toolbar no-print">
        <div className="left">
          <Link
            href={`/dashboard/events/${event.id}`}
            className="inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l&apos;événement
          </Link>
        </div>
        <div className="right">
          <Link
            href={`/dashboard/events/${event.id}/courses?mode=${showOnlyShortage ? "full" : "shortage"}`}
            className=""
          >
            {showOnlyShortage ? "Vue complète" : "Manques seulement"}
          </Link>
          <PrintButton />
        </div>
      </div>

      <article className="courses">
        <header className="courses-header">
          <div>
            <p className="courses-eyebrow">Liste de courses</p>
            <h1 className="courses-title">{event.title}</h1>
            <div className="courses-meta">
              <strong>{formatDateFR(event.date)}</strong>
              {event.location && <> · {event.location}</>}
              {clientName && (
                <>
                  <br />Client&nbsp;: <strong>{clientName}</strong>
                </>
              )}
              {event.guests_count && (
                <> · {event.guests_count}&nbsp;invités</>
              )}
            </div>
          </div>

          {menuLines.length > 0 && (
            <dl className="courses-menu">
              <dt>Menu prévu</dt>
              <dd>
                {menuLines.map((m, i) => (
                  <div key={i}>
                    <strong>× {m.qty}</strong> · {m.name}
                  </div>
                ))}
                <div style={{ marginTop: 6, fontSize: 10, opacity: 0.7 }}>
                  Total : {totalCocktails} cocktails
                </div>
              </dd>
            </dl>
          )}
        </header>

        {supplierGroups.length === 0 ? (
          <div className="courses-empty">
            {totalNeed.size === 0
              ? "Aucun menu saisi pour cet événement — ajoute des cocktails sur la fiche event pour générer la liste."
              : showOnlyShortage
                ? "✓ Tout est en stock. Aucune course à faire pour cet événement."
                : "Aucun produit à acheter."}
          </div>
        ) : (
          supplierGroups.map((g) => (
            <section key={g.name} className="supplier-group">
              <div className="supplier-header">
                <span className="supplier-name">{g.name}</span>
                <span className="supplier-count">
                  {g.lines.length} produit{g.lines.length > 1 ? "s" : ""}
                </span>
              </div>
              <table className="courses-table">
                <thead>
                  <tr>
                    <th className="check"></th>
                    <th>Produit</th>
                    <th className="num">À acheter</th>
                    <th className="num">Unité</th>
                    <th className="num">PU</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((l) => (
                    <tr key={l.productId}>
                      <td className="check"><span /></td>
                      <td>
                        <div className="prod-name">{l.productName}</div>
                        <div className="prod-sub">
                          {l.category}
                          {l.perUnit && l.contentUnit && ` · ${l.perUnit} ${l.contentUnit}/${l.unit}`}
                          {showOnlyShortage && (
                            <> · besoin {l.packsNeeded}, stock {l.stockQty}</>
                          )}
                        </div>
                      </td>
                      <td className="num qty">{l.toBuy}</td>
                      <td className="num unit">{l.unit}</td>
                      <td className="num">
                        {l.costPerPack != null ? formatEUR(l.costPerPack) : "—"}
                      </td>
                      <td className="num">
                        {l.lineCost != null ? formatEUR(l.lineCost) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {g.subtotal > 0 && (
                <div className="supplier-subtotal">
                  Sous-total {g.name}&nbsp;: <strong>{formatEUR(g.subtotal)}</strong>
                </div>
              )}
            </section>
          ))
        )}

        {supplierGroups.length > 0 && grandTotal > 0 && (
          <div className="courses-totals">
            <span className="label">
              {showOnlyShortage ? "Total à acheter" : "Total matière"}
            </span>
            <span className="value">{formatEUR(grandTotal)}</span>
          </div>
        )}

        <footer className="courses-footer">
          Liste générée le {formatDateFR(new Date(), { withTime: true })} ·
          Cosmo Club Paris · à valider à réception fournisseur.
        </footer>
      </article>
    </div>
  );
}
