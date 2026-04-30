import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type MarginLine = {
  label: string;
  amount: number;
  hint?: string | null;
};

export type EventMargin = {
  /** Revenue net of agency commission. The commission is paid out, not
   * kept, so we don't count it as our top line. */
  revenueNetHt: number;
  /** Original total HT from the quote, before subtracting commission. */
  grossRevenueHt: number;
  commissionHt: number;
  /** Actual stock consumed × cost_ht. Falls back to reservations
   * (event_stock.qty_reserved) when the event hasn't been closed yet
   * and there are no movements. */
  stockCostHt: number;
  /** Staff hourly cost: Σ (hours_done ?? hours_planned) × rate. */
  staffCostHt: number;
  marginHt: number;
  /** marginHt / revenueNetHt × 100 (null when revenue is 0). */
  marginPct: number | null;
  /**
   * `actual` once at least one stock_movement exists for the event,
   * otherwise `projected` — useful for showing "estimation" labels in
   * the UI before the event is closed.
   */
  basis: "actual" | "projected" | "none";
};

/**
 * Compute the real margin for one event:
 *
 *   marginHt = (revenue − commission) − stockCost − staffCost
 *
 * Pulls directly from supabase. Designed to be called inside server
 * components that already have a supabase client — no extra auth.
 */
export async function computeEventMargin(
  supabase: SupabaseClient<Database>,
  eventId: string,
): Promise<EventMargin | null> {
  // 1. Event + quote (for revenue + commission rate)
  const { data: event } = await supabase
    .from("events")
    .select("id,quote_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return null;

  let grossRevenueHt = 0;
  let commissionRate = 0;
  if (event.quote_id) {
    const { data: quote } = await supabase
      .from("quotes")
      .select("total_ht,commission_rate")
      .eq("id", event.quote_id)
      .maybeSingle();
    if (quote) {
      grossRevenueHt = Number(quote.total_ht ?? 0);
      commissionRate = Number(quote.commission_rate ?? 0);
    }
  }
  const commissionHt =
    commissionRate > 0
      ? Math.round((grossRevenueHt * commissionRate) / 100)
      : 0;
  // The owner-side revenue is what stays AFTER the commission is paid.
  // The total_ht already includes the gross-up; subtracting the
  // commission gets us back to the original sub-total.
  const revenueNetHt = Math.round(grossRevenueHt - commissionHt);

  // 2. Stock cost — prefer real consumption (stock_movements OUT),
  //    fall back to reservations for upcoming events.
  const [
    { data: movements },
    { data: reservations },
  ] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("product_id,qty,direction")
      .eq("event_id", eventId)
      .eq("direction", "out"),
    supabase
      .from("event_stock")
      .select("product_id,qty_reserved")
      .eq("event_id", eventId),
  ]);

  const usingActual = (movements?.length ?? 0) > 0;
  const consumptionByProduct = new Map<string, number>();
  if (usingActual) {
    for (const m of movements ?? []) {
      consumptionByProduct.set(
        m.product_id,
        (consumptionByProduct.get(m.product_id) ?? 0) + Number(m.qty ?? 0),
      );
    }
  } else {
    for (const r of reservations ?? []) {
      consumptionByProduct.set(
        r.product_id,
        (consumptionByProduct.get(r.product_id) ?? 0) + Number(r.qty_reserved ?? 0),
      );
    }
  }

  let stockCostHt = 0;
  if (consumptionByProduct.size > 0) {
    const productIds = Array.from(consumptionByProduct.keys());
    const { data: products } = await supabase
      .from("products")
      .select("id,cost_ht")
      .in("id", productIds);
    const costByProduct = new Map(
      (products ?? []).map((p) => [p.id, Number(p.cost_ht ?? 0)]),
    );
    for (const [productId, qty] of consumptionByProduct.entries()) {
      const unitCost = costByProduct.get(productId) ?? 0;
      stockCostHt += qty * unitCost;
    }
    stockCostHt = Math.round(stockCostHt * 100) / 100;
  }

  // 3. Staff cost — prefer hours_done, fall back to hours_planned.
  const { data: assignments } = await supabase
    .from("event_staff")
    .select("staff_id,hours_planned,hours_done,rate_override")
    .eq("event_id", eventId);

  let staffCostHt = 0;
  if ((assignments?.length ?? 0) > 0) {
    const staffIds = Array.from(
      new Set((assignments ?? []).map((a) => a.staff_id)),
    );
    const { data: staffRows } = staffIds.length
      ? await supabase
          .from("staff")
          .select("id,hourly_rate")
          .in("id", staffIds)
      : { data: [] };
    const rateByStaff = new Map(
      (staffRows ?? []).map((s) => [s.id, Number(s.hourly_rate ?? 0)]),
    );
    for (const a of assignments ?? []) {
      const hours = Number(a.hours_done ?? a.hours_planned ?? 0);
      const rate = a.rate_override
        ? Number(a.rate_override)
        : (rateByStaff.get(a.staff_id) ?? 0);
      staffCostHt += hours * rate;
    }
    staffCostHt = Math.round(staffCostHt * 100) / 100;
  }

  const marginHt = Math.round((revenueNetHt - stockCostHt - staffCostHt) * 100) / 100;
  const marginPct =
    revenueNetHt > 0
      ? Math.round((marginHt / revenueNetHt) * 1000) / 10
      : null;

  const basis: EventMargin["basis"] = !event.quote_id && consumptionByProduct.size === 0
    ? "none"
    : usingActual
      ? "actual"
      : "projected";

  return {
    revenueNetHt,
    grossRevenueHt,
    commissionHt,
    stockCostHt,
    staffCostHt,
    marginHt,
    marginPct,
    basis,
  };
}
