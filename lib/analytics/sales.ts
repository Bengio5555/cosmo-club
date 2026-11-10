// Module pur : « ce qui se vend » à partir des lignes de devis acceptés,
// et synthèse par type d'événement. Testable sans base.

export type QuoteLineLite = {
  quote_id: string;
  title: string;
  section: string | null;
  qty: number;
  line_total_ht: number | null;
};

export type SalesItem = {
  key: string;
  /** Intitulé le plus fréquent dans le groupe, tel qu'écrit dans les devis. */
  label: string;
  section: string | null;
  revenueHt: number;
  lines: number;
  /** Nombre de devis distincts qui contiennent la ligne. */
  quotes: number;
  /** quotes / total des devis acceptés de la période, en %. */
  presencePct: number;
  qty: number;
};

/**
 * Clé de regroupement d'un intitulé : minuscules, sans accents, chiffres
 * remplacés par #, texte entre parenthèses retiré. « Barman (6h) » et
 * « Barman (5h) » tombent ensemble ; « Glaçons 20 kg » et « Glaçons 40 kg »
 * aussi.
 */
export function salesKey(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+([.,]\d+)?/g, " # ")
    .replace(/[^a-z#&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function aggregateSales(lines: QuoteLineLite[], totalQuotes: number): SalesItem[] {
  const groups = new Map<
    string,
    { labels: Map<string, number>; sections: Map<string, number>; revenueHt: number; lines: number; quotes: Set<string>; qty: number }
  >();
  for (const l of lines) {
    const title = (l.title ?? "").trim();
    if (!title) continue;
    const key = salesKey(title);
    if (!key) continue;
    const g = groups.get(key) ?? { labels: new Map(), sections: new Map(), revenueHt: 0, lines: 0, quotes: new Set(), qty: 0 };
    g.labels.set(title, (g.labels.get(title) ?? 0) + 1);
    const sec = l.section ?? "";
    g.sections.set(sec, (g.sections.get(sec) ?? 0) + 1);
    g.revenueHt += Number(l.line_total_ht ?? 0);
    g.lines += 1;
    g.quotes.add(l.quote_id);
    g.qty += Number(l.qty ?? 0);
    groups.set(key, g);
  }
  const top = (m: Map<string, number>) => Array.from(m.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  return Array.from(groups.entries())
    .map(([key, g]) => ({
      key,
      label: top(g.labels),
      section: top(g.sections) || null,
      revenueHt: Math.round(g.revenueHt * 100) / 100,
      lines: g.lines,
      quotes: g.quotes.size,
      presencePct: totalQuotes > 0 ? Math.round((g.quotes.size / totalQuotes) * 100) : 0,
      qty: g.qty,
    }))
    .sort((a, b) => b.revenueHt - a.revenueHt);
}

export type SectionTotal = { section: string; revenueHt: number; sharePct: number };

export function totalsBySection(items: SalesItem[]): SectionTotal[] {
  const acc = new Map<string, number>();
  let total = 0;
  for (const it of items) {
    const k = it.section ?? "Sans section";
    acc.set(k, (acc.get(k) ?? 0) + it.revenueHt);
    total += it.revenueHt;
  }
  return Array.from(acc.entries())
    .map(([section, revenueHt]) => ({ section, revenueHt, sharePct: total > 0 ? Math.round((revenueHt / total) * 100) : 0 }))
    .sort((a, b) => b.revenueHt - a.revenueHt);
}

/* ─── Par type d'événement ─────────────────────────────────────────── */

export type EventForType = {
  type: string;
  revenueNetHt: number;
  marginHt: number | null; // null si pas de base de calcul
  guests: number | null;
};

export type QuoteForType = { type: string; status: string };

export type TypeSummary = {
  type: string;
  events: number;
  revenueHt: number;
  avgBasket: number;
  revenuePerGuest: number | null;
  marginPct: number | null; // marge pondérée sur les événements qui en ont une
  marginEvents: number;
  quotesSent: number;
  quotesAccepted: number;
  acceptancePct: number | null;
};

export function summarizeByType(events: EventForType[], quotes: QuoteForType[]): TypeSummary[] {
  const types = new Set<string>([...events.map((e) => e.type), ...quotes.map((q) => q.type)]);
  const out: TypeSummary[] = [];
  for (const type of types) {
    const evs = events.filter((e) => e.type === type);
    const revenue = evs.reduce((s, e) => s + e.revenueNetHt, 0);
    const withGuests = evs.filter((e) => e.guests && e.guests > 0);
    const guests = withGuests.reduce((s, e) => s + (e.guests ?? 0), 0);
    const guestRevenue = withGuests.reduce((s, e) => s + e.revenueNetHt, 0);
    const withMargin = evs.filter((e) => e.marginHt !== null && e.revenueNetHt > 0);
    const mRev = withMargin.reduce((s, e) => s + e.revenueNetHt, 0);
    const mMar = withMargin.reduce((s, e) => s + (e.marginHt ?? 0), 0);
    const qs = quotes.filter((q) => q.type === type && q.status !== "brouillon");
    const decided = qs.filter((q) => q.status === "accepte" || q.status === "refuse" || q.status === "expire");
    const accepted = qs.filter((q) => q.status === "accepte").length;
    out.push({
      type,
      events: evs.length,
      revenueHt: Math.round(revenue),
      avgBasket: evs.length ? Math.round(revenue / evs.length) : 0,
      revenuePerGuest: guests > 0 ? Math.round(guestRevenue / guests) : null,
      marginPct: mRev > 0 ? Math.round((mMar / mRev) * 1000) / 10 : null,
      marginEvents: withMargin.length,
      quotesSent: qs.length,
      quotesAccepted: accepted,
      acceptancePct: decided.length ? Math.round((accepted / decided.length) * 100) : null,
    });
  }
  return out.sort((a, b) => b.revenueHt - a.revenueHt);
}
