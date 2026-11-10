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
