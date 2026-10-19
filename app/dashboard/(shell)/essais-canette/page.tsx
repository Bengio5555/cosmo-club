import { createClient } from "@/lib/supabase/server";
import { formatDateFR } from "@/lib/format";
import { recettes } from "@/lib/content/canettes";

/**
 * Essais de personnalisation sur la page canettes : les marques que les
 * visiteurs posent sur la canette. Anonyme (identifiant de session tiré
 * au hasard), aucune donnée de contact. Lecture seule, 300 derniers.
 */
const RECIPE_LABEL: Record<string, string> = Object.fromEntries(recettes.map((r) => [r.id, r.name]));

/** ISO timestamp of seven days ago, for the weekly counter. */
function sevenDaysAgo(): string {
  return new Date(Date.now() - 7 * 86400_000).toISOString();
}

export default async function EssaisCanettePage() {
  const supabase = await createClient();
  const [{ data: tries, error }, { count: last7 }] = await Promise.all([
    supabase
      .from("can_sticker_tries")
      .select("id,brand,subtitle,recipe,ink,session_id,created_at")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("can_sticker_tries").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo()),
  ]);

  const rows = tries ?? [];
  const sessions = new Set(rows.map((t) => t.session_id)).size;
  const byRecipe = recettes.map((r) => ({ name: r.name, n: rows.filter((t) => t.recipe === r.id).length }));

  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pilotage · Page canettes
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
            Essais canette
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            Les marques que les visiteurs posent sur la canette dans l&apos;aperçu de personnalisation. Données anonymes, une ligne par marque et par session, conservées 12 mois.
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
            Lecture impossible ({error.message}). La table <code>can_sticker_tries</code> est-elle créée ? Voir docs/migrations/2026-10-09_can_sticker_tries.sql.
          </p>
        )}

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Essais (300 derniers)" value={rows.length} />
          <Stat label="7 derniers jours" value={last7 ?? 0} />
          <Stat label="Sessions distinctes" value={sessions} />
        </div>

        <div className="mb-8 flex flex-wrap gap-3 text-sm">
          {byRecipe.map((r) => (
            <span key={r.name} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 dark:border-slate-700 dark:text-slate-300">
              {r.name} · <strong>{r.n}</strong>
            </span>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Marque</th>
                <th className="px-4 py-3">Sous-titre</th>
                <th className="px-4 py-3">Recette</th>
                <th className="px-4 py-3">Encre</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">Aucun essai enregistré pour le moment.</td>
                </tr>
              )}
              {rows.map((t) => (
                <tr key={t.id} className="text-slate-800 dark:text-slate-200">
                  <td className="px-4 py-3 font-medium">{t.brand}</td>
                  <td className="px-4 py-3 text-slate-500">{t.subtitle ?? "—"}</td>
                  <td className="px-4 py-3">{RECIPE_LABEL[t.recipe] ?? t.recipe}</td>
                  <td className="px-4 py-3 capitalize">{t.ink}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDateFR(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
