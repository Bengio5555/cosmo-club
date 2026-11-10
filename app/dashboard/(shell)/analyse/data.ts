import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { computeEventMarginsBatch } from "@/lib/server/eventMargin";
import { extraCostLines, parseExtraCosts, type EventExtraCosts } from "@/lib/extraCosts";
import { groupDebits, monthsBetween, sumBy, type Merchant, type NamedCost } from "@/lib/analytics/costs";
import { aggregateSales, summarizeByType, totalsBySection, type SalesItem, type SectionTotal, type TypeSummary } from "@/lib/analytics/sales";

export type Period = { key: string; label: string; from: string | null; to: string | null };

/**
 * Premier événement avec sorties de stock enregistrées : Thevenin Paris,
 * 29 août 2026 (premier mouvement saisi le 31). Avant cette date, ni les
 * sorties ni les retours de stock n'étaient faits : le coût boissons vaut 0
 * et la marge serait fausse. Ces événements comptent dans le CA, pas dans
 * les marges.
 */
export const REAL_MARGIN_SINCE = "2026-08-29";

/** Périodes proposées : 12 mois glissants, années civiles, tout. */
export function resolvePeriod(raw: string | undefined, today = new Date()): Period {
  const y = today.getFullYear();
  if (raw && /^\d{4}$/.test(raw)) {
    return { key: raw, label: raw, from: `${raw}-01-01`, to: `${raw}-12-31` };
  }
  if (raw === "tout") return { key: "tout", label: "Tout", from: null, to: null };
  const from = new Date(today);
  from.setFullYear(y - 1);
  from.setDate(1);
  return { key: "12m", label: "12 derniers mois", from: from.toISOString().slice(0, 10), to: null };
}

export type MarginRow = {
  id: string;
  title: string;
  date: string;
  status: Database["public"]["Enums"]["event_status"];
  type: string;
  client: string | null;
  guests: number | null;
  revenueNetHt: number;
  stockCostHt: number;
  staffCostHt: number;
  extraCostHt: number;
  marginHt: number | null;
  marginPct: number | null;
  basis: "actual" | "projected" | "none" | "avant";
  /** Ce qui manque pour une marge réelle (événement passé seulement). */
  missing: string[];
};

export type CocktailStat = { id: string; name: string; events: number; qty: number };

export type CostsData = {
  /** Coûts portés par les événements suivis (depuis REAL_MARGIN_SINCE) de la période. */
  events: {
    count: number;
    revenueHt: number;
    stockHt: number;
    staffHt: number;
    extraHt: number;
    stockByCategory: NamedCost[];
    stockByProduct: NamedCost[];
    staffByPerson: NamedCost[];
    extrasByLabel: NamedCost[];
  };
  /** Sorties du compte Qonto sur la période (limité à ce qui est importé). */
  bank: {
    available: boolean;
    from: string | null;
    to: string | null;
    months: number;
    total: number;
    perMonth: number;
    fixedPerMonth: number;
    merchants: Merchant[];
    byMonth: { month: string; total: number }[];
  };
};

export type AnalyticsData = {
  period: Period;
  rows: MarginRow[];
  kpi: {
    events: number;
    withMargin: number;
    revenueHt: number;
    marginHt: number;
    marginPct: number | null;
    revenuePerGuest: number | null;
    best: MarginRow | null;
    worst: MarginRow | null;
    actualCount: number;
  };
  sales: { items: SalesItem[]; sections: SectionTotal[]; quotes: number };
  cocktails: CocktailStat[];
  types: TypeSummary[];
  costs: CostsData;
};

export async function loadAnalytics(supabase: SupabaseClient<Database>, period: Period, today = new Date()): Promise<AnalyticsData> {
  const todayISO = today.toISOString().slice(0, 10);
  // 1. Événements de la période (hors annulés)
  let evq = supabase.from("events").select("*").neq("status", "annule").order("date", { ascending: false }).limit(500);
  if (period.from) evq = evq.gte("date", period.from);
  if (period.to) evq = evq.lte("date", period.to);
  const { data: eventsRaw } = await evq;
  const events = (eventsRaw ?? []) as Array<Database["public"]["Tables"]["events"]["Row"] & { extra_costs?: unknown }>;

  const quoteIds = Array.from(new Set(events.map((e) => e.quote_id).filter((x): x is string => !!x)));
  const clientIds = Array.from(new Set(events.map((e) => e.client_id).filter((x): x is string => !!x)));

  // 2. Devis : ceux liés aux événements + ceux émis sur la période (taux d'acceptation)
  let qAll = supabase.from("quotes").select("id,event_type,status,issue_date,event_date,total_ht,guests_count").neq("status", "brouillon").limit(1000);
  if (period.from) qAll = qAll.gte("issue_date", period.from);
  if (period.to) qAll = qAll.lte("issue_date", period.to);

  const extraByEvent = new Map<string, EventExtraCosts>();
  for (const e of events) extraByEvent.set(e.id, parseExtraCosts(e.extra_costs));

  const [{ data: linkedQuotes }, { data: periodQuotes }, { data: clients }, margins] = await Promise.all([
    quoteIds.length ? supabase.from("quotes").select("id,event_type,guests_count").in("id", quoteIds) : Promise.resolve({ data: [] as { id: string; event_type: string | null; guests_count: number | null }[] }),
    qAll,
    clientIds.length ? supabase.from("clients").select("id,first_name,last_name,company_name").in("id", clientIds) : Promise.resolve({ data: [] as { id: string; first_name: string | null; last_name: string | null; company_name: string | null }[] }),
    computeEventMarginsBatch(supabase, events.map((e) => ({ id: e.id, quote_id: e.quote_id })), extraByEvent),
  ]);
  const quoteById = new Map((linkedQuotes ?? []).map((q) => [q.id, q]));
  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  // Pour « données manquantes » : staff sans heures faites, pas de sortie stock
  const eventIds = events.map((e) => e.id);
  const [{ data: staffRows }, { data: moveRows }, { data: cocktailRows }] = await Promise.all([
    eventIds.length ? supabase.from("event_staff").select("event_id,hours_done").in("event_id", eventIds) : Promise.resolve({ data: [] as { event_id: string; hours_done: number | null }[] }),
    eventIds.length ? supabase.from("stock_movements").select("event_id").in("event_id", eventIds).eq("direction", "out") : Promise.resolve({ data: [] as { event_id: string | null }[] }),
    eventIds.length ? supabase.from("event_cocktails").select("event_id,cocktail_id,qty_planned").in("event_id", eventIds) : Promise.resolve({ data: [] as { event_id: string; cocktail_id: string; qty_planned: number }[] }),
  ]);
  const staffByEvent = new Map<string, { total: number; done: number }>();
  for (const s of staffRows ?? []) {
    const v = staffByEvent.get(s.event_id) ?? { total: 0, done: 0 };
    v.total += 1;
    if (s.hours_done != null) v.done += 1;
    staffByEvent.set(s.event_id, v);
  }
  const movesByEvent = new Set((moveRows ?? []).map((m) => m.event_id).filter(Boolean));

  const rows: MarginRow[] = events.map((e) => {
    const m = margins.get(e.id);
    const q = e.quote_id ? quoteById.get(e.quote_id) : undefined;
    const c = e.client_id ? clientById.get(e.client_id) : undefined;
    const client = c ? c.company_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || null : null;
    const missing: string[] = [];
    const past = (e.end_date ?? e.date) < todayISO;
    const beforeTracking = e.date < REAL_MARGIN_SINCE;
    if (past && !beforeTracking && e.status !== "termine") missing.push("à clôturer");
    if (past && !beforeTracking) {
      if (!e.quote_id) missing.push("devis non lié");
      const st = staffByEvent.get(e.id);
      if (!st) missing.push("aucun staff");
      else if (st.done < st.total) missing.push("heures faites");
      if (!movesByEvent.has(e.id)) missing.push("sorties stock");
    }
    const hasMargin = !beforeTracking && !!m && m.basis !== "none" && m.revenueNetHt > 0;
    return {
      id: e.id,
      title: e.title,
      date: e.date,
      status: e.status,
      type: q?.event_type ?? "autre",
      client,
      guests: e.guests_count ?? q?.guests_count ?? null,
      revenueNetHt: m?.revenueNetHt ?? 0,
      stockCostHt: m?.stockCostHt ?? 0,
      staffCostHt: m?.staffCostHt ?? 0,
      extraCostHt: m?.extraCostHt ?? 0,
      marginHt: hasMargin ? m.marginHt : null,
      marginPct: hasMargin ? m.marginPct : null,
      basis: beforeTracking ? "avant" : (m?.basis ?? "none"),
      missing,
    };
  });

  const withRevenue = rows.filter((r) => r.revenueNetHt > 0);
  const withMargin = rows.filter((r) => r.marginHt !== null);
  const revenueHt = withRevenue.reduce((s, r) => s + r.revenueNetHt, 0);
  const marginRevenueHt = withMargin.reduce((s, r) => s + r.revenueNetHt, 0);
  const marginHt = withMargin.reduce((s, r) => s + (r.marginHt ?? 0), 0);
  const guestRows = withRevenue.filter((r) => r.guests && r.guests > 0);
  const guests = guestRows.reduce((s, r) => s + (r.guests ?? 0), 0);
  const sortedPct = withMargin.filter((r) => r.marginPct !== null).sort((a, b) => (b.marginPct ?? 0) - (a.marginPct ?? 0));

  // 3. Ce qui se vend : lignes des devis acceptés dont l'événement tombe dans la période
  // On préfère la date d'événement pour la période, sinon la date d'émission
  let acceptedAll = supabase.from("quotes").select("id,event_date,issue_date").eq("status", "accepte").limit(1000);
  if (period.from) acceptedAll = acceptedAll.or(`event_date.gte.${period.from},and(event_date.is.null,issue_date.gte.${period.from})`);
  if (period.to) acceptedAll = acceptedAll.or(`event_date.lte.${period.to},and(event_date.is.null,issue_date.lte.${period.to})`);
  const { data: acceptedRows } = await acceptedAll;
  const acceptedIds = (acceptedRows ?? []).map((q) => q.id);
  const { data: lines } = acceptedIds.length
    ? await supabase.from("quote_items").select("quote_id,title,section,qty,line_total_ht").in("quote_id", acceptedIds).limit(5000)
    : { data: [] as { quote_id: string; title: string; section: string | null; qty: number; line_total_ht: number | null }[] };
  const items = aggregateSales(lines ?? [], acceptedIds.length);

  // Cocktails les plus commandés (menus d'événements de la période)
  const cocktailAcc = new Map<string, { events: Set<string>; qty: number }>();
  for (const r of cocktailRows ?? []) {
    const v = cocktailAcc.get(r.cocktail_id) ?? { events: new Set(), qty: 0 };
    v.events.add(r.event_id);
    v.qty += Number(r.qty_planned ?? 0);
    cocktailAcc.set(r.cocktail_id, v);
  }
  const cocktailIds = Array.from(cocktailAcc.keys());
  const { data: cocktailNames } = cocktailIds.length
    ? await supabase.from("cocktails").select("id,name").in("id", cocktailIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((cocktailNames ?? []).map((c) => [c.id, c.name]));
  const cocktails: CocktailStat[] = cocktailIds
    .map((id) => ({ id, name: nameById.get(id) ?? "Cocktail", events: cocktailAcc.get(id)!.events.size, qty: cocktailAcc.get(id)!.qty }))
    .sort((a, b) => b.events - a.events || b.qty - a.qty)
    .slice(0, 10);

  // 4. Par type
  const types = summarizeByType(
    rows.map((r) => ({ type: r.type, revenueNetHt: r.revenueNetHt, marginHt: r.marginHt, guests: r.guests })),
    (periodQuotes ?? []).map((q) => ({ type: q.event_type ?? "autre", status: q.status })),
  );

  // 5. Ce qui nous coûte
  const trackedIds = rows.filter((r) => r.basis === "actual" || r.basis === "projected").map((r) => r.id);
  const trackedRows = rows.filter((r) => trackedIds.includes(r.id));
  const [{ data: outMoves }, { data: staffLines }] = await Promise.all([
    trackedIds.length
      ? supabase.from("stock_movements").select("event_id,product_id,qty").in("event_id", trackedIds).eq("direction", "out")
      : Promise.resolve({ data: [] as { event_id: string | null; product_id: string; qty: number }[] }),
    trackedIds.length
      ? supabase.from("event_staff").select("event_id,staff_id,hours_planned,hours_done,rate_override").in("event_id", trackedIds)
      : Promise.resolve({ data: [] as { event_id: string; staff_id: string; hours_planned: number; hours_done: number | null; rate_override: number | null }[] }),
  ]);
  const productIds = Array.from(new Set((outMoves ?? []).map((m) => m.product_id)));
  const staffIds = Array.from(new Set((staffLines ?? []).map((s) => s.staff_id)));
  const [{ data: products }, { data: staffPeople }] = await Promise.all([
    productIds.length ? supabase.from("products").select("id,name,category,cost_ht,unit").in("id", productIds) : Promise.resolve({ data: [] as { id: string; name: string; category: string; cost_ht: number | null; unit: string }[] }),
    staffIds.length ? supabase.from("staff").select("id,full_name,role,hourly_rate").in("id", staffIds) : Promise.resolve({ data: [] as { id: string; full_name: string; role: string; hourly_rate: number | null }[] }),
  ]);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const staffById = new Map((staffPeople ?? []).map((p) => [p.id, p]));
  const moveRowsCost = (outMoves ?? []).map((m) => {
    const p = productById.get(m.product_id);
    return { product: p?.name ?? "Produit", category: p?.category ?? "autre", unit: p?.unit ?? "", qty: Number(m.qty ?? 0), cost: Number(m.qty ?? 0) * Number(p?.cost_ht ?? 0) };
  });
  const staffRowsCost = (staffLines ?? []).map((s) => {
    const p = staffById.get(s.staff_id);
    const hours = Number(s.hours_done ?? s.hours_planned ?? 0);
    const rate = s.rate_override ? Number(s.rate_override) : Number(p?.hourly_rate ?? 0);
    return { id: s.staff_id, name: p?.full_name ?? "Extra", role: p?.role ?? "", hours, cost: hours * rate };
  });
  const extraRows = trackedRows.flatMap((r) => extraCostLines(extraByEvent.get(r.id) ?? parseExtraCosts(null)).map((l) => ({ label: l.label.split(" — ")[0], amount: l.amount })));

  const bankAvailable = true;
  let bq = supabase.from("bank_transactions").select("amount,label,operation_type,settled_at").eq("side", "debit").eq("status", "completed").order("settled_at", { ascending: true }).limit(2000);
  if (period.from) bq = bq.gte("settled_at", period.from);
  if (period.to) bq = bq.lte("settled_at", `${period.to}T23:59:59Z`);
  const { data: debits, error: bankErr } = await bq;
  const debitRows = bankErr ? [] : (debits ?? []);
  const bankFrom = debitRows[0]?.settled_at?.slice(0, 10) ?? null;
  const bankTo = debitRows.at(-1)?.settled_at?.slice(0, 10) ?? null;
  const bankMonths = bankFrom && bankTo ? monthsBetween(bankFrom, bankTo) : 0;
  const merchants = groupDebits(debitRows, bankMonths);
  const byMonthMap = new Map<string, number>();
  for (const d of debitRows) {
    const m = (d.settled_at ?? "").slice(0, 7);
    if (m) byMonthMap.set(m, (byMonthMap.get(m) ?? 0) + Number(d.amount));
  }
  const bankTotal = debitRows.reduce((s, d) => s + Number(d.amount), 0);

  const costs: CostsData = {
    events: {
      count: trackedRows.length,
      revenueHt: Math.round(trackedRows.reduce((s, r) => s + r.revenueNetHt, 0)),
      stockHt: Math.round(trackedRows.reduce((s, r) => s + r.stockCostHt, 0)),
      staffHt: Math.round(trackedRows.reduce((s, r) => s + r.staffCostHt, 0)),
      extraHt: Math.round(trackedRows.reduce((s, r) => s + r.extraCostHt, 0)),
      stockByCategory: sumBy(moveRowsCost, (r) => r.category, (r) => r.category, (r) => r.cost),
      stockByProduct: sumBy(moveRowsCost, (r) => r.product, (r) => r.product, (r) => r.cost, (rows) => `${Math.round(rows.reduce((s, r) => s + r.qty, 0))} ${rows[0]?.unit ?? ""}`.trim()).slice(0, 10),
      staffByPerson: sumBy(staffRowsCost, (r) => r.id, (r) => r.name, (r) => r.cost, (rows) => `${Math.round(rows.reduce((s, r) => s + r.hours, 0))} h · ${rows.length} évén.`),
      extrasByLabel: sumBy(extraRows, (r) => r.label.toLowerCase(), (r) => r.label, (r) => r.amount),
    },
    bank: {
      available: bankAvailable && !bankErr,
      from: bankFrom,
      to: bankTo,
      months: Math.round(bankMonths * 10) / 10,
      total: Math.round(bankTotal),
      perMonth: bankMonths ? Math.round(bankTotal / bankMonths) : 0,
      fixedPerMonth: Math.round(merchants.filter((m) => m.recurring).reduce((s, m) => s + m.perMonth, 0)),
      merchants: merchants.slice(0, 15),
      byMonth: Array.from(byMonthMap.entries()).map(([month, total]) => ({ month, total: Math.round(total) })).sort((a, b) => a.month.localeCompare(b.month)),
    },
  };

  return {
    period,
    rows,
    costs,
    kpi: {
      events: rows.length,
      withMargin: withMargin.length,
      revenueHt: Math.round(revenueHt),
      marginHt: Math.round(marginHt),
      marginPct: marginRevenueHt > 0 ? Math.round((marginHt / marginRevenueHt) * 1000) / 10 : null,
      revenuePerGuest: guests > 0 ? Math.round(guestRows.reduce((s, r) => s + r.revenueNetHt, 0) / guests) : null,
      best: sortedPct[0] ?? null,
      worst: sortedPct.length > 1 ? sortedPct[sortedPct.length - 1] : null,
      actualCount: withMargin.filter((r) => r.basis === "actual").length,
    },
    sales: { items, sections: totalsBySection(items), quotes: acceptedIds.length },
    cocktails,
    types,
  };
}
