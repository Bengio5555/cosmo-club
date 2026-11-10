import Link from "next/link";
import { formatDateFR, formatEUR } from "@/lib/format";
import { REAL_MARGIN_SINCE, type AnalyticsData } from "./data";
import { MarginTable } from "./MarginTable";
import { CostsBlock, Kpi, SalesBlock, TypesBlock } from "./Blocks";

const PERIODS = (year: number) => [
  { key: "12m", label: "12 derniers mois" },
  { key: String(year), label: String(year) },
  { key: String(year - 1), label: String(year - 1) },
  { key: "tout", label: "Tout" },
];

export function AnalyseView({ data, threshold, year }: { data: AnalyticsData; threshold: number; year: number }) {
  const { kpi } = data;
  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">Analyse</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Rentabilité par événement, ce qui se vend, et lecture par type. Chiffres HT, nets de commission d&apos;apporteur.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Marges calculées à partir du {formatDateFR(REAL_MARGIN_SINCE)}, début du suivi des sorties de stock ; avant, les événements comptent dans le CA
            seulement. Une marge est « réelle » quand les sorties de stock sont enregistrées, sinon estimée sur les réservations et les heures prévues. Les
            lignes sous {threshold} % sont surlignées.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PERIODS(year).map((p) => (
            <Link
              key={p.key}
              href={`/dashboard/analyse?periode=${p.key}${threshold !== 40 ? `&seuil=${threshold}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                data.period.key === p.key
                  ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                  : "border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="CA HT net" value={formatEUR(kpi.revenueHt)} hint={`${kpi.events} événement${kpi.events > 1 ? "s" : ""} sur la période`} />
        <Kpi
          label="Marge"
          value={kpi.marginPct !== null ? `${kpi.marginPct} %` : "—"}
          hint={`${formatEUR(kpi.marginHt)} sur ${kpi.withMargin} événement${kpi.withMargin > 1 ? "s" : ""} · réelle sur ${kpi.actualCount}, estimée sur ${kpi.withMargin - kpi.actualCount}`}
          tone={kpi.marginPct !== null && kpi.marginPct < threshold ? "warn" : "ok"}
        />
        <Kpi label="CA par invité" value={kpi.revenuePerGuest !== null ? formatEUR(kpi.revenuePerGuest) : "—"} hint="Événements avec nombre d'invités" />
        <Kpi
          label="Meilleure / moins bonne marge"
          value={kpi.best ? `${kpi.best.marginPct} %` : "—"}
          hint={kpi.best ? `${kpi.best.title}${kpi.worst ? ` · pire : ${kpi.worst.title} (${kpi.worst.marginPct} %)` : ""}` : undefined}
        />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Rentabilité par événement</h2>
        <MarginTable rows={data.rows} threshold={threshold} />
      </section>

      <section className="mb-8">
        <SalesBlock sales={data.sales} cocktails={data.cocktails} />
      </section>

      <section className="mb-8">
        <TypesBlock types={data.types} />
      </section>

      <section className="mb-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Ce qui nous coûte</h2>
        <CostsBlock costs={data.costs} since={REAL_MARGIN_SINCE} />
      </section>

      <p className="text-xs text-slate-500">
        Pour fiabiliser les marges : sur chaque événement terminé, saisir les heures faites du staff et valider les sorties de stock. La colonne « Base »
        signale ce qui manque.
      </p>
    </div>
  );
}
