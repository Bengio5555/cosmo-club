import Link from "next/link";
import { Radar, Globe, Inbox, Bot, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import { formatDateFR } from "@/lib/format";
import { GEO_CATEGORIES, type GeoCategory } from "@/lib/geo/questions";
import { loadGeoActionData } from "@/lib/server/geoActions";
import { outcomeOf, pickActions } from "@/lib/geo/actions";
import { RerunButton } from "./RerunButton";
import { TodoBlock, type DoneItem, type TodoItem } from "./TodoBlock";

// Le bouton « Relancer maintenant » exécute le passage complet dans
// l'action serveur : on reprend la durée max du cron.
export const maxDuration = 300;

/**
 * Visibilité IA : est-ce que les assistants IA recommandent Cosmo Club,
 * qui ils citent à notre place, combien de demandes en viennent, et
 * quelles pages leurs robots lisent.
 */
export default async function VisibilitePage() {
  const supabase = await createClient();
  const role = await getCurrentRole();
  const since30 = daysAgoISO(30);
  const since6m = daysAgoISO(183);

  const [{ data: runs, error: runsError }, { data: aiLeads }, { data: hits }] = await Promise.all([
    supabase
      .from("geo_runs")
      .select("id,ran_at,questions,cited,cost_usd,error")
      .order("ran_at", { ascending: false })
      .limit(8),
    supabase
      .from("leads")
      .select("id,created_at,contact_name,company,event_type,landing_page")
      .eq("channel", "ai_assistant")
      .gte("created_at", since6m)
      .order("created_at", { ascending: false }),
    supabase
      .from("ai_bot_hits")
      .select("bot,path")
      .gte("hit_at", since30)
      .limit(10000),
  ]);

  const latest = runs?.[0] ?? null;
  const recentRunIds = (runs ?? []).slice(0, 4).map((r) => r.id);
  const { data: results } = recentRunIds.length
    ? await supabase
        .from("geo_results")
        .select("run_id,question,category,cited,cited_domains,answer_excerpt,error")
        .in("run_id", recentRunIds)
    : { data: [] };

  const latestResults = (results ?? []).filter((r) => r.run_id === latest?.id);

  // Sites cités à notre place, sur les 4 derniers passages (plus stable qu'une seule semaine).
  const domainCounts = new Map<string, number>();
  for (const r of results ?? []) {
    for (const d of new Set(r.cited_domains)) domainCounts.set(d, (domainCounts.get(d) ?? 0) + 1);
  }
  const topDomains = [...domainCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const answersConsidered = (results ?? []).filter((r) => !r.error).length;

  const byCategory = new Map<string, { cited: number; total: number }>();
  for (const r of latestResults) {
    if (r.error) continue;
    const c = byCategory.get(r.category) ?? { cited: 0, total: 0 };
    c.total += 1;
    if (r.cited) c.cited += 1;
    byCategory.set(r.category, c);
  }

  const months = lastMonths(6);
  const leadsByMonth = new Map(months.map((m) => [m.key, 0]));
  for (const l of aiLeads ?? []) {
    const k = l.created_at.slice(0, 7);
    if (leadsByMonth.has(k)) leadsByMonth.set(k, (leadsByMonth.get(k) ?? 0) + 1);
  }
  const maxLeads = Math.max(1, ...leadsByMonth.values());

  const botCounts = countBy(hits ?? [], (h) => h.bot);
  const pathCounts = countBy(hits ?? [], (h) => h.path).slice(0, 10);

  const missingMigration = runsError?.message.includes("geo_runs");

  // « À faire cette semaine » : règles fixes sur les passages et les avis en attente.
  const todo = missingMigration ? null : await loadGeoActionData(supabase);
  const todoItems: TodoItem[] = todo
    ? pickActions(todo.candidates, todo.decisions, new Date().toISOString().slice(0, 10)).map((a) => ({
        key: a.key,
        title: a.title,
        detail: a.detail,
        href: a.href,
        hrefLabel: a.hrefLabel,
        hasArticle: !!a.article,
      }))
    : [];
  const doneItems: DoneItem[] = (todo?.decisions ?? [])
    .filter((d) => d.status === "done" && d.done_at)
    .sort((a, b) => String(b.done_at).localeCompare(String(a.done_at)))
    .slice(0, 10)
    .map((d) => {
      const o = outcomeOf(d, todo!.runs, todo!.results, new Date());
      return {
        key: d.key,
        title: d.title,
        doneOn: formatDateFR(d.done_at),
        ...(o?.state === "measured"
          ? {
              result: `cité ${o.before.cited} fois sur ${o.before.total} avant, ${o.after.cited} sur ${o.after.total} après${o.better ? "" : " : pas encore d'effet"}`,
              tone: o.better ? ("good" as const) : ("neutral" as const),
            }
          : o?.state === "waiting"
            ? { result: `effet mesuré à partir du ${formatDateFR(o.readyOn)}`, tone: "waiting" as const }
            : { result: "pas de mesure pour ce type d'action", tone: "neutral" as const }),
      };
    });
  const chronological = [...(runs ?? [])].reverse();
  const maxPct = Math.max(0.01, ...chronological.map((r) => (r.questions ? r.cited / r.questions : 0)));

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Visibilité IA
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Chaque lundi, 24 questions de futurs clients sont posées à un assistant IA qui cherche
            sur le web. On regarde s&apos;il recommande Cosmo Club, et qui il cite à notre place.
          </p>
        </div>
        {(role === "owner" || role === "admin") && !missingMigration && <RerunButton />}
      </header>

      {runsError && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {missingMigration
            ? "La base n'est pas encore à jour : applique docs/migrations/2026-10-26_geo_visibility.sql dans Supabase."
            : runsError.message}
        </div>
      )}

      {todo && <TodoBlock items={todoItems} done={doneItems} />}

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        <SectionTitle icon={Radar} title="Recommandé par les assistants IA" />
        {latest ? (
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="text-3xl font-semibold text-slate-900 dark:text-white">
                {latest.cited} <span className="text-lg font-normal text-slate-500">sur {latest.questions}</span>
              </p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                réponses citent Cosmo Club · passage du {formatDateFR(latest.ran_at)}
              </p>
              {latest.error && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{latest.error}</p>
              )}
              <div className="mt-5 flex h-20 items-end gap-2" aria-label="8 derniers passages">
                {chronological.map((r) => {
                  const pct = r.questions ? r.cited / r.questions : 0;
                  return (
                    <div key={r.id} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">{r.cited}</span>
                      <div
                        className="w-full rounded-sm bg-[color:var(--color-grenat)]"
                        // Relatif au meilleur passage : à ~20 % de citations, une échelle sur 100 % écrase tout.
                        style={{ height: `${Math.max(3, (pct / maxPct) * 48)}px`, opacity: r.id === latest.id ? 1 : 0.45 }}
                        title={`${formatDateFR(r.ran_at)} : ${r.cited}/${r.questions}`}
                      />
                      <span className="text-[9px] text-slate-500">
                        {new Date(r.ran_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <ul className="space-y-1.5 text-sm">
              {(Object.keys(GEO_CATEGORIES) as GeoCategory[]).map((k) => {
                const c = byCategory.get(k);
                if (!c) return null;
                return (
                  <li key={k} className="flex items-center justify-between gap-3">
                    <span className="text-slate-700 dark:text-slate-300">{GEO_CATEGORIES[k]}</span>
                    <span className={c.cited ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-slate-500"}>
                      {c.cited} / {c.total}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          !runsError && (
            <p className="text-sm text-slate-500">
              Pas encore de passage. Le premier aura lieu lundi matin, ou tout de suite avec « Relancer maintenant ».
            </p>
          )
        )}
      </section>

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        <SectionTitle icon={Globe} title="Les sites cités à notre place" />
        <p className="-mt-2 mb-4 text-xs text-slate-500">
          {`Annuaires, articles et concurrents que les assistants recommandent, sur les 4 derniers passages (${answersConsidered} réponses). Être présent sur ces sites est le moyen le plus direct d'être cité.`}
        </p>
        {topDomains.length ? (
          <ol className="grid gap-x-8 gap-y-1.5 text-sm md:grid-cols-2">
            {topDomains.map(([domain, count]) => (
              <li key={domain} className="flex items-center justify-between gap-3">
                <a
                  href={`https://${domain}`}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="truncate text-slate-800 underline-offset-2 hover:underline dark:text-slate-200"
                >
                  {domain}
                </a>
                <span className="shrink-0 text-xs text-slate-500">{count} réponse{count > 1 ? "s" : ""}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">Rien à afficher pour l&apos;instant.</p>
        )}
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          <SectionTitle icon={Inbox} title="Demandes venues d'un assistant IA" />
          <div className="mb-4 flex h-16 items-end gap-2">
            {months.map((m) => {
              const n = leadsByMonth.get(m.key) ?? 0;
              return (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-600 dark:text-slate-400">{n}</span>
                  <div
                    className="w-full rounded-sm bg-slate-400 dark:bg-slate-600"
                    style={{ height: `${Math.max(2, (n / maxLeads) * 40)}px` }}
                  />
                  <span className="text-[9px] text-slate-500">{m.label}</span>
                </div>
              );
            })}
          </div>
          {aiLeads && aiLeads.length > 0 ? (
            <ul className="divide-y divide-slate-100 text-xs dark:divide-slate-900">
              {aiLeads.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-1.5">
                  <Link href={`/dashboard/leads/${l.id}`} className="truncate text-slate-800 hover:underline dark:text-slate-200">
                    {l.company || l.contact_name || "Demande"}
                  </Link>
                  <span className="shrink-0 text-slate-500">
                    {formatDateFR(l.created_at)}
                    {l.landing_page ? ` · ${l.landing_page}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">Aucune demande venue d&apos;un assistant IA sur 6 mois.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          <SectionTitle icon={Bot} title="Passages des robots IA · 30 jours" />
          {botCounts.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <ul className="space-y-1 text-xs">
                {botCounts.map(([bot, n]) => (
                  <li key={bot} className="flex justify-between gap-3">
                    <span className="text-slate-700 dark:text-slate-300">{bot}</span>
                    <span className="text-slate-500">{n}</span>
                  </li>
                ))}
              </ul>
              <ul className="space-y-1 text-xs">
                {pathCounts.map(([path, n]) => (
                  <li key={path} className="flex justify-between gap-3">
                    <span className="truncate font-mono text-slate-700 dark:text-slate-300">{path}</span>
                    <span className="shrink-0 text-slate-500">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Aucun passage relevé pour l&apos;instant.</p>
          )}
          <p className="mt-4 text-[11px] text-slate-500">
            Indicatif : un robot peut se faire passer pour un autre. Les pages lues souvent sont celles que les
            assistants peuvent reprendre.
          </p>
        </section>
      </div>

      {latestResults.length > 0 && (
        <details className="group rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-slate-900 dark:text-white">
            Détail des réponses du dernier passage
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-900 dark:border-slate-900">
            {latestResults.map((r) => (
              <li key={r.question} className="px-5 py-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-800 dark:text-slate-200">{r.question}</p>
                  <span
                    className={
                      r.error
                        ? "shrink-0 text-amber-700 dark:text-amber-300"
                        : r.cited
                          ? "shrink-0 text-emerald-700 dark:text-emerald-400"
                          : "shrink-0 text-slate-500"
                    }
                  >
                    {r.error ? "Erreur" : r.cited ? "Cité" : "Pas cité"}
                  </span>
                </div>
                {r.answer_excerpt && <p className="mt-1 text-slate-500">{r.answer_excerpt}</p>}
                {r.error && <p className="mt-1 text-amber-700 dark:text-amber-300">{r.error}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
      <Icon className="h-4 w-4 text-slate-500" />
      {title}
    </h2>
  );
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 86400000).toISOString();
}

function countBy<T>(rows: T[], key: (r: T) => string): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) m.set(key(r), (m.get(key(r)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1));
    out.push({
      key: m.toISOString().slice(0, 7),
      label: m.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" }),
    });
  }
  return out;
}
