import {
  TrendingUp,
  TrendingDown,
  Euro,
  Wine,
  Users,
  Receipt,
} from "lucide-react";
import { formatEUR } from "@/lib/format";
import type { EventMargin } from "@/lib/server/eventMargin";

/**
 * Server-only section that surfaces a real-margin breakdown on the
 * event detail page. Reads the pre-computed `EventMargin` so the page
 * can fan out the Supabase query in parallel with the rest.
 */
export function MarginSection({ margin }: { margin: EventMargin | null }) {
  if (!margin || (margin.basis === "none" && margin.revenueNetHt === 0)) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-5">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Rentabilité</h2>
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-500">
          Pas encore de devis lié ni de réservation stock — la marge se
          calculera dès qu&apos;un devis est rattaché ou qu&apos;une
          réservation est saisie.
        </p>
      </section>
    );
  }

  const positive = margin.marginHt >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  const accent = positive ? "text-emerald-700 dark:text-emerald-300" : "text-red-300";
  const accentBg = positive
    ? "border-emerald-500/30 bg-emerald-500/5"
    : "border-red-500/30 bg-red-500/5";

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Rentabilité</h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-500">
            {margin.basis === "actual"
              ? "Calcul réel — basé sur les mouvements stock OUT et heures effectuées."
              : margin.basis === "projected"
                ? "Estimation — basée sur les réservations et heures planifiées."
                : "Aucune base de calcul disponible."}
          </p>
        </div>
      </div>

      <div className={`mt-4 flex items-center gap-3 rounded-lg border p-4 ${accentBg}`}>
        <Icon className={`h-5 w-5 ${accent}`} />
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            Marge nette
          </p>
          <p className={`mt-0.5 font-display text-2xl ${accent}`}>
            {formatEUR(margin.marginHt)}
            {margin.marginPct != null && (
              <span className="ml-2 text-base font-normal text-slate-500 dark:text-neutral-400">
                ({margin.marginPct.toFixed(1)} %)
              </span>
            )}
          </p>
        </div>
      </div>

      <ul className="mt-4 space-y-2 text-sm">
        <Line
          icon={Euro}
          label="Revenu HT (net commission)"
          value={margin.revenueNetHt}
          tone="positive"
          hint={
            margin.commissionHt > 0
              ? `${formatEUR(margin.grossRevenueHt)} − ${formatEUR(margin.commissionHt)} reversés à l'apporteur`
              : null
          }
        />
        <Line
          icon={Wine}
          label="Coût stock"
          value={-margin.stockCostHt}
          tone="cost"
          hint={
            margin.basis === "actual"
              ? "Mouvements OUT × cost_ht produit"
              : "Réservations × cost_ht (avant clôture)"
          }
        />
        <Line
          icon={Users}
          label="Coût staff"
          value={-margin.staffCostHt}
          tone="cost"
          hint="Heures × taux horaire (override prioritaire si défini)"
        />
        {margin.commissionHt > 0 && (
          <Line
            icon={Receipt}
            label="Apporteur d'affaires"
            value={-margin.commissionHt}
            tone="cost"
            hint="Reversé sur le total HT (déjà déduit du revenu net)"
            muted
          />
        )}
      </ul>
    </section>
  );
}

function Line({
  icon: Icon,
  label,
  value,
  tone,
  hint,
  muted,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone: "positive" | "cost";
  hint?: string | null;
  muted?: boolean;
}) {
  const valueCls = muted
    ? "text-slate-500 dark:text-neutral-500"
    : tone === "cost"
      ? "text-amber-700 dark:text-amber-300/90"
      : "text-emerald-700 dark:text-emerald-300";
  return (
    <li className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-neutral-900 pb-2 last:border-b-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-neutral-500" />
        <div className="min-w-0">
          <p className="text-slate-700 dark:text-neutral-200">{label}</p>
          {hint && (
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-500">{hint}</p>
          )}
        </div>
      </div>
      <p className={`shrink-0 font-mono text-sm tabular-nums ${valueCls}`}>
        {value >= 0 ? formatEUR(value) : `−${formatEUR(-value)}`}
      </p>
    </li>
  );
}
