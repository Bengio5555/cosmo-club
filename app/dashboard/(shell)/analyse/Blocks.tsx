import { formatEUR } from "@/lib/format";
import { REVENUE_TYPE_LABEL, type EventType } from "@/lib/dashboard/revenue";
import type { AnalyticsData } from "./data";

export function Kpi({ label, value, hint, tone = "neutral" }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" | "neutral" }) {
  const color = tone === "ok" ? "text-emerald-600 dark:text-emerald-400" : tone === "warn" ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/* ─── Bloc 2 : ce qui se vend ─────────────────────────────────────── */

export function SalesBlock({ sales, cocktails }: { sales: AnalyticsData["sales"]; cocktails: AnalyticsData["cocktails"] }) {
  const top = sales.items.slice(0, 15);
  const max = top[0]?.revenueHt ?? 1;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card
          title="Ce qui se vend"
          sub={`Lignes des ${sales.quotes} devis acceptés de la période, regroupées par intitulé. « Présence » = part des devis qui contiennent la ligne.`}
        >
          {top.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun devis accepté sur la période.</p>
          ) : (
            <ul className="space-y-2">
              {top.map((it) => (
                <li key={it.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900 dark:text-white">{it.label}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-full rounded-full bg-sky-500" style={{ width: `${Math.max(2, Math.round((it.revenueHt / max) * 100))}%` }} />
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="tabular-nums font-semibold text-slate-900 dark:text-white">{formatEUR(it.revenueHt)}</p>
                    <p className="tabular-nums text-slate-500">
                      {it.quotes} devis · présence {it.presencePct} %
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <div className="space-y-4">
        <Card title="Par famille" sub="Part du CA des devis acceptés.">
          <ul className="space-y-1.5 text-sm">
            {sales.sections.map((s) => (
              <li key={s.section} className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-700 dark:text-slate-300">{s.section}</span>
                <span className="shrink-0 tabular-nums text-xs text-slate-500">
                  <strong className="text-slate-900 dark:text-white">{s.sharePct} %</strong> · {formatEUR(s.revenueHt)}
                </span>
              </li>
            ))}
            {sales.sections.length === 0 && <li className="text-slate-500">—</li>}
          </ul>
        </Card>
        <Card title="Cocktails les plus commandés" sub="D'après les menus des événements de la période.">
          <ol className="space-y-1.5 text-sm">
            {cocktails.map((c, i) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span className="truncate text-slate-700 dark:text-slate-300">
                  <span className="mr-1.5 tabular-nums text-slate-400">{i + 1}.</span>
                  {c.name}
                </span>
                <span className="shrink-0 tabular-nums text-xs text-slate-500">
                  {c.events} évén. · {c.qty} prévus
                </span>
              </li>
            ))}
            {cocktails.length === 0 && <li className="text-slate-500">Aucun menu renseigné sur la période.</li>}
          </ol>
        </Card>
      </div>
    </div>
  );
}

/* ─── Bloc 3 : par type d'événement ───────────────────────────────── */

export function TypesBlock({ types }: { types: AnalyticsData["types"] }) {
  return (
    <Card title="Par type d'événement" sub="CA net de commission des événements de la période ; taux d'acceptation sur les devis émis dans la période (hors devis encore en attente).">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-right">Événements</th>
              <th className="px-3 py-2 text-right">CA HT</th>
              <th className="px-3 py-2 text-right">Panier moyen</th>
              <th className="px-3 py-2 text-right">CA / invité</th>
              <th className="px-3 py-2 text-right">Marge</th>
              <th className="px-3 py-2 text-right">Devis acceptés</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
            {types.map((t) => (
              <tr key={t.type}>
                <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{REVENUE_TYPE_LABEL[t.type as EventType] ?? t.type}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.events}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{formatEUR(t.revenueHt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.events ? formatEUR(t.avgBasket) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.revenuePerGuest !== null ? formatEUR(t.revenuePerGuest) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {t.marginPct !== null ? (
                    <>
                      <span className={t.marginPct < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}>{t.marginPct} %</span>
                      <span className="ml-1 text-xs text-slate-500">sur {t.marginEvents}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {t.quotesSent ? (
                    <>
                      {t.quotesAccepted}/{t.quotesSent}
                      {t.acceptancePct !== null && <span className="ml-1 text-xs text-slate-500">({t.acceptancePct} %)</span>}
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {types.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-slate-500">Rien sur la période.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ─── Bloc 4 : ce qui nous coûte ──────────────────────────────────── */

const PRODUCT_CATEGORY_LABEL: Record<string, string> = {
  spiritueux: "Spiritueux",
  sirops: "Sirops",
  garnitures: "Garnitures",
  verrerie: "Verrerie",
  consommables: "Consommables",
  tech: "Tech",
  autre: "Autre",
};

function pct(part: number, total: number): string {
  return total > 0 ? `${Math.round((part / total) * 100)} %` : "—";
}

function CostList({ items, total, max = 8, emptyText }: { items: { key: string; label: string; amount: number; hint?: string }[]; total: number; max?: number; emptyText: string }) {
  const shown = items.slice(0, max);
  const top = shown[0]?.amount ?? 1;
  if (shown.length === 0) return <p className="text-sm text-slate-500">{emptyText}</p>;
  return (
    <ul className="space-y-1.5">
      {shown.map((it) => (
        <li key={it.key} className="text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">
              {it.label}
              {it.hint && <span className="ml-1.5 text-xs text-slate-500">{it.hint}</span>}
            </span>
            <span className="shrink-0 tabular-nums text-xs text-slate-500">
              <strong className="text-slate-900 dark:text-white">{formatEUR(it.amount)}</strong>
              {total > 0 && <span className="ml-1">· {pct(it.amount, total)}</span>}
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(2, Math.round((it.amount / top) * 100))}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CostsBlock({ costs, since }: { costs: AnalyticsData["costs"]; since: string }) {
  const ev = costs.events;
  const totalEv = ev.stockHt + ev.staffHt + ev.extraHt;
  const bank = costs.bank;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Coûts des événements" value={formatEUR(totalEv)} hint={`${ev.count} événement${ev.count > 1 ? "s" : ""} suivis · ${pct(totalEv, ev.revenueHt)} du CA`} />
        <Kpi label="Staff" value={formatEUR(ev.staffHt)} hint={`${pct(ev.staffHt, ev.revenueHt)} du CA`} />
        <Kpi label="Boissons" value={formatEUR(ev.stockHt)} hint={`${pct(ev.stockHt, ev.revenueHt)} du CA`} />
        <Kpi label="Frais annexes" value={formatEUR(ev.extraHt)} hint={`${pct(ev.extraHt, ev.revenueHt)} du CA · verrerie, glaçons, suppléments`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Staff par personne" sub="Heures faites si saisies, sinon prévues, au taux horaire.">
          <CostList items={ev.staffByPerson} total={ev.staffHt} emptyText="Aucun staff sur les événements suivis." />
        </Card>
        <Card title="Boissons par famille et par produit" sub="Sorties de stock des événements suivis, au coût d'achat.">
          <CostList items={ev.stockByCategory.map((c) => ({ ...c, label: PRODUCT_CATEGORY_LABEL[c.label] ?? c.label }))} total={ev.stockHt} max={6} emptyText="Aucune sortie de stock sur la période." />
          {ev.stockByProduct.length > 0 && (
            <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Produits les plus coûteux</p>
              <CostList items={ev.stockByProduct} total={ev.stockHt} max={8} emptyText="" />
            </div>
          )}
        </Card>
        <Card title="Frais annexes" sub="Saisis sur chaque événement.">
          <CostList items={ev.extrasByLabel} total={ev.extraHt} emptyText="Aucun frais annexe saisi." />
        </Card>
      </div>

      <Card
        title="Sorties du compte Qonto"
        sub={
          bank.available
            ? bank.from
              ? `Du ${bank.from.split("-").reverse().join("/")} au ${bank.to?.split("-").reverse().join("/")} (${bank.months} mois importés) : ${formatEUR(bank.total)}, soit ${formatEUR(bank.perMonth)} par mois, dont ${formatEUR(bank.fixedPerMonth)} de charges fixes repérées.`
              : "Aucune sortie bancaire sur la période."
            : "Banque non disponible."
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <ul className="space-y-1.5">
            {bank.merchants.map((m) => (
              <li key={m.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-slate-800 dark:text-slate-200">
                  {m.label}
                  {m.recurring && (
                    <span className="ml-1.5 rounded-full border border-sky-300 px-1.5 py-0.5 text-[10px] font-medium uppercase text-sky-700 dark:border-sky-800 dark:text-sky-300">fixe</span>
                  )}
                  <span className="ml-1.5 text-xs text-slate-500">
                    {m.count} opération{m.count > 1 ? "s" : ""}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-xs text-slate-500">
                  <strong className="text-slate-900 dark:text-white">{formatEUR(m.total)}</strong>
                  <span className="ml-1">· {formatEUR(m.perMonth)}/mois</span>
                </span>
              </li>
            ))}
            {bank.merchants.length === 0 && <li className="text-sm text-slate-500">—</li>}
          </ul>
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Par mois</p>
            <ul className="space-y-1 text-sm">
              {bank.byMonth.map((m) => (
                <li key={m.month} className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-400">{monthLabel(m.month)}</span>
                  <span className="tabular-nums font-medium text-slate-900 dark:text-white">{formatEUR(m.total)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">
              Les coûts des événements ci-dessus sont des coûts internes (stock au prix d&apos;achat, heures au taux). La banque montre l&apos;argent réellement sorti,
              événements et frais généraux confondus, depuis le {since.split("-").reverse().join("/")} pour les marges.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}
