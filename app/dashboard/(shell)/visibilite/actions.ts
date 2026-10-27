"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import { runGeoVisibility } from "@/lib/server/geoVisibility";

/** Un passage coûte quelques dollars : relance manuelle limitée à une par 20 h. */
const MIN_INTERVAL_MS = 20 * 3600 * 1000;

export async function rerunGeoCheck() {
  const role = await getCurrentRole();
  if (role !== "owner" && role !== "admin") {
    return { ok: false as const, error: "Réservé aux administrateurs." };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("geo_runs")
    .select("ran_at")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.ran_at).getTime() < MIN_INTERVAL_MS) {
    return { ok: false as const, error: "Un passage a déjà eu lieu il y a moins de 20 h." };
  }

  const result = await runGeoVisibility();
  revalidatePath("/dashboard/visibilite");
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, cited: result.cited, questions: result.questions };
}
