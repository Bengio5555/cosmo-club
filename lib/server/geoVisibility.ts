import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { profiles, site } from "@/lib/site";
import { askOne, GEO_MODEL, hostOf } from "@/lib/geo/aiMentions";
import { GEO_QUESTIONS, type GeoQuestion } from "@/lib/geo/questions";

/** Plafond de dépense d'un passage : on arrête de poser des questions au-delà. */
const BUDGET_USD = 5;
const CONCURRENCY = 6;
/** Fonction limitée à 300 s : plus de nouvelle question après 220 s. */
const DEADLINE_MS = 220_000;
/** Les passages de robots IA sont gardés 90 jours. */
const BOT_HITS_RETENTION_DAYS = 90;

export type GeoRunSummary =
  | { ok: true; runId: string; questions: number; cited: number; costUsd: number; skipped: number }
  | { ok: false; error: string };

/**
 * Passage hebdomadaire « Visibilité IA » : pose les questions de
 * lib/geo/questions.ts, enregistre geo_runs + geo_results (clé de
 * service), puis purge les vieux passages de robots. Appelé par le cron
 * du lundi et par le bouton « Relancer maintenant ».
 */
export async function runGeoVisibility(opts: { limit?: number } = {}): Promise<GeoRunSummary> {
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY manquante." };
  const ownDomain = hostOf(site.url) ?? "cosmoclub.fr";
  const brandTerms = [site.name, "Cosmo Club"];
  const questions = GEO_QUESTIONS.slice(0, opts.limit ?? GEO_QUESTIONS.length);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 90_000, maxRetries: 1 });
  const startedAt = Date.now();

  const results: (Awaited<ReturnType<typeof askOne>> & GeoQuestion)[] = [];
  let spent = 0;
  let next = 0;
  let skipped = 0;
  async function worker() {
    while (next < questions.length) {
      if (spent >= BUDGET_USD || Date.now() - startedAt > DEADLINE_MS) {
        skipped += questions.length - next;
        next = questions.length;
        return;
      }
      const q = questions[next++];
      const r = await askOne(client, q.question, { ownDomain, brandTerms, profileUrls: profiles.map((p) => p.url) });
      spent += r.costUsd;
      results.push({ ...r, ...q });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const order = new Map(questions.map((q, i) => [q.question, i]));
  results.sort((a, b) => (order.get(a.question) ?? 0) - (order.get(b.question) ?? 0));
  const answered = results.filter((r) => !r.error);
  const cited = answered.filter((r) => r.cited).length;
  const allFailed = results.length > 0 && answered.length === 0;

  const admin = createAdminClient();
  const { data: run, error: runError } = await admin
    .from("geo_runs")
    .insert({
      model: GEO_MODEL,
      questions: answered.length,
      cited,
      cost_usd: +spent.toFixed(4),
      error: allFailed
        ? results[0]?.error ?? "Échec"
        : skipped
          ? `Passage interrompu (plafond de ${BUDGET_USD} $ ou de durée) : ${skipped} question(s) non posée(s).`
          : null,
    })
    .select("id")
    .single();
  if (runError || !run) return { ok: false, error: runError?.message ?? "Enregistrement impossible." };

  if (results.length) {
    const { error: resError } = await admin.from("geo_results").insert(
      results.map((r) => ({
        run_id: run.id,
        question: r.question,
        category: r.category,
        cited: r.cited,
        cited_domains: r.citedDomains,
        cited_sources: r.citedSources,
        answer_excerpt: r.excerpt || null,
        error: r.error,
      })),
    );
    if (resError) return { ok: false, error: resError.message };
  }

  const cutoff = new Date(Date.now() - BOT_HITS_RETENTION_DAYS * 86400000).toISOString();
  await admin.from("ai_bot_hits").delete().lt("hit_at", cutoff);

  return { ok: true, runId: run.id, questions: answered.length, cited, costUsd: spent, skipped };
}
