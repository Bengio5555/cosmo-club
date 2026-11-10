import { createClient } from "@/lib/supabase/server";
import { loadAnalytics, resolvePeriod } from "./data";
import { AnalyseView } from "./AnalyseView";

type SP = Promise<{ periode?: string; seuil?: string }>;

export const metadata = { title: "Analyse" };

/**
 * Analyse : rentabilité par événement (bloc 1), ce qui se vend (bloc 2),
 * synthèse par type d'événement (bloc 3). Période via ?periode=12m|2026|tout,
 * seuil d'alerte de marge via ?seuil=40.
 */
export default async function AnalysePage({ searchParams }: { searchParams: SP }) {
  const { periode, seuil } = await searchParams;
  const today = new Date();
  const period = resolvePeriod(periode, today);
  const parsed = Number(seuil);
  const threshold = Number.isFinite(parsed) && parsed > 0 && parsed < 100 ? Math.round(parsed) : 40;
  const supabase = await createClient();
  const data = await loadAnalytics(supabase, period);
  return <AnalyseView data={data} threshold={threshold} year={today.getFullYear()} />;
}
