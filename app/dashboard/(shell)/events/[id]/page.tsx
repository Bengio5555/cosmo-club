import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  User,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EventEditor } from "./EventEditor";
import { StaffSection } from "./StaffSection";
import { StockSection } from "./StockSection";
import { MenuSection } from "./MenuSection";
import { autoStartDueEvents } from "../actions";

type Params = Promise<{ id: string }>;

export default async function EventDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  // Sweep overdue → en_cours so the detail page already shows the
  // correct state when the user lands.
  await autoStartDueEvents();
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    notFound();
  }

  const [
    { data: client },
    { data: quote },
    { data: allStaff },
    { data: assignments },
    { data: allProducts },
    { data: reservations },
    { data: menuRaw },
    { data: cocktailOptions },
  ] = await Promise.all([
    event.client_id
      ? supabase.from("clients").select("*").eq("id", event.client_id).maybeSingle()
      : Promise.resolve({ data: null }),
    event.quote_id
      ? supabase
          .from("quotes")
          .select("id,number,status,total_ttc")
          .eq("id", event.quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("staff")
      .select("id,full_name,role,hourly_rate,archived")
      .eq("archived", false)
      .order("full_name"),
    supabase
      .from("event_staff")
      .select("*")
      .eq("event_id", id),
    supabase
      .from("products")
      .select(
        "id,name,category,unit,stock_qty,archived,content_per_unit,content_unit,cost_ht",
      )
      .eq("archived", false)
      .order("category")
      .order("name"),
    supabase
      .from("event_stock")
      .select("*")
      .eq("event_id", id),
    supabase
      .from("event_cocktails")
      .select("event_id,cocktail_id,qty_planned")
      .eq("event_id", id),
    supabase
      .from("cocktails")
      .select("id,name,category")
      .eq("archived", false)
      .order("category", { nullsFirst: false })
      .order("name"),
  ]);

  // Resolve cocktail names for the menu rows + ingredients for the
  // "Calculer le stock" modal (done server-side so the client gets an
  // already-computed breakdown).
  const menuCocktailIds = (menuRaw ?? []).map((m) => m.cocktail_id);
  const [{ data: menuCocktailDetails }, { data: menuIngredients }] =
    await Promise.all([
      menuCocktailIds.length
        ? supabase
            .from("cocktails")
            .select("id,name,category")
            .in("id", menuCocktailIds)
        : Promise.resolve({ data: [] }),
      menuCocktailIds.length
        ? supabase
            .from("cocktail_ingredients")
            .select("cocktail_id,product_id,qty")
            .in("cocktail_id", menuCocktailIds)
        : Promise.resolve({ data: [] }),
    ]);
  const cocktailById = new Map(
    (menuCocktailDetails ?? []).map((c) => [c.id, c]),
  );
  const menu = (menuRaw ?? []).map((m) => ({
    ...m,
    cocktail: cocktailById.get(m.cocktail_id) ?? {
      id: m.cocktail_id,
      name: "—",
      category: null,
    },
  }));

  // Compute stock need per product.
  const productsById = new Map(
    (allProducts ?? []).map((p) => [p.id, p]),
  );

  // Build the reservation snapshot used by the closure modal. Pulled
  // here rather than client-fetched so the popup has names+units ready
  // instantly when the owner clicks "Clôturer".
  const closeReservations = (reservations ?? [])
    .map((r) => {
      const p = productsById.get(r.product_id);
      if (!p) return null;
      return {
        product_id: r.product_id,
        product_name: p.name,
        unit: p.unit,
        qty_reserved: Number(r.qty_reserved ?? 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .filter((r) => r.qty_reserved > 0)
    .sort((a, b) => a.product_name.localeCompare(b.product_name));
  const qtyByCocktail = new Map(
    (menuRaw ?? []).map((m) => [m.cocktail_id, m.qty_planned]),
  );
  const totalNeed = new Map<string, number>();
  for (const ing of menuIngredients ?? []) {
    const planned = qtyByCocktail.get(ing.cocktail_id) ?? 0;
    if (!planned) continue;
    totalNeed.set(
      ing.product_id,
      (totalNeed.get(ing.product_id) ?? 0) + Number(ing.qty) * planned,
    );
  }

  const computed = Array.from(totalNeed.entries())
    .map(([productId, need]) => {
      const p = productsById.get(productId);
      if (!p) return null;
      const perUnit = p.content_per_unit ? Number(p.content_per_unit) : null;
      const packs =
        perUnit && perUnit > 0 ? Math.ceil(need / perUnit) : Math.ceil(need);
      const stockQty = Number(p.stock_qty ?? 0);
      const shortage = Math.max(0, packs - stockQty);
      const costHt = p.cost_ht != null ? Number(p.cost_ht) : null;
      const lineCost = costHt != null ? Math.round(costHt * packs * 100) / 100 : null;
      return {
        productId,
        productName: p.name,
        productCategory: p.category,
        need,
        contentUnit: p.content_unit ?? p.unit,
        packUnit: p.unit,
        perUnit,
        packsNeeded: packs,
        stockQty,
        shortage,
        costPerPack: costHt,
        lineCost,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .sort((a, b) => {
      // Sort shortages first, then by product category+name
      if (a.shortage > 0 && b.shortage === 0) return -1;
      if (a.shortage === 0 && b.shortage > 0) return 1;
      return (a.productCategory + a.productName).localeCompare(
        b.productCategory + b.productName,
      );
    });

  return (
    <>
      <div className="border-b border-neutral-900 px-4 pt-6 md:px-8">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Tous les événements
        </Link>
      </div>

      <EventEditor event={event} closeReservations={closeReservations} />

      <div className="px-4 pb-5 md:px-8">
        <MenuSection
          eventId={event.id}
          eventStatus={event.status}
          menu={menu}
          cocktailOptions={cocktailOptions ?? []}
          computed={computed}
          existingReservationCount={(reservations ?? []).length}
        />
      </div>

      <div className="grid gap-5 px-4 pb-6 md:grid-cols-2 md:px-8">
        <StaffSection
          eventId={event.id}
          eventStatus={event.status}
          staffOptions={allStaff ?? []}
          assignments={assignments ?? []}
        />
        <StockSection
          eventId={event.id}
          eventStatus={event.status}
          productOptions={allProducts ?? []}
          reservations={reservations ?? []}
        />
      </div>

      {(client || quote) && (
        <div className="border-t border-neutral-900 px-4 py-6 md:px-8">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {client && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Client
                </p>
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="group inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  <User className="h-3.5 w-3.5" />
                  {client.company_name ||
                    [client.first_name, client.last_name]
                      .filter(Boolean)
                      .join(" ") ||
                    client.email ||
                    "—"}
                  <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {client.email && (
                    <a
                      href={`mailto:${client.email}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 hover:border-neutral-700 hover:text-white"
                    >
                      <Mail className="h-3 w-3" /> {client.email}
                    </a>
                  )}
                  {client.phone && (
                    <a
                      href={`tel:${client.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-neutral-300 hover:border-neutral-700 hover:text-white"
                    >
                      <Phone className="h-3 w-3" /> {client.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
            {quote && (
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  Devis source
                </p>
                <Link
                  href={`/dashboard/devis/${quote.id}`}
                  className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-neutral-700 hover:text-white"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {quote.number}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
