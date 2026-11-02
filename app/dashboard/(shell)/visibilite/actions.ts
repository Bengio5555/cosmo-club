"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRole } from "@/lib/auth/server";
import { runGeoVisibility } from "@/lib/server/geoVisibility";
import { draftOutreach, loadGeoActionData } from "@/lib/server/geoActions";
import { baselineFor, snoozeUntil } from "@/lib/geo/actions";

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

const TODO_ROLES = ["owner", "admin", "manager"];
const KEY_RE = /^(reviews|site|profile|content):[a-z0-9.\-_]{1,120}$/i;

/**
 * « Fait » ou « Plus tard » sur une action du bloc À faire. La clé est
 * revérifiée contre les actions recalculées côté serveur : le navigateur
 * ne peut ni inventer une action ni fausser la base de la mesure.
 */
export async function decideGeoAction(key: string, decision: "done" | "snoozed") {
  const role = await getCurrentRole();
  if (!role || !TODO_ROLES.includes(role)) return { ok: false as const, error: "Accès refusé." };
  if (!KEY_RE.test(key) || (decision !== "done" && decision !== "snoozed")) {
    return { ok: false as const, error: "Action inconnue." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Session expirée." };

  const data = await loadGeoActionData(supabase);
  const action = data.candidates.find((a) => a.key === key);
  if (!action) return { ok: false as const, error: "Cette action n'est plus d'actualité." };

  const now = new Date();
  const { error } = await supabase.from("geo_actions").upsert({
    key,
    kind: action.kind,
    title: action.title,
    status: decision,
    snoozed_until: decision === "snoozed" ? snoozeUntil(now) : null,
    done_at: decision === "done" ? now.toISOString() : null,
    baseline: decision === "done" ? baselineFor(action, data.runs, data.results) : null,
    updated_by: user.id,
    updated_at: now.toISOString(),
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/visibilite");
  return { ok: true as const };
}

/** Brouillon d'e-mail pour une action « article » : rien n'est envoyé. */
export async function draftGeoOutreach(key: string) {
  const role = await getCurrentRole();
  if (!role || !TODO_ROLES.includes(role)) return { ok: false as const, error: "Accès refusé." };
  if (!KEY_RE.test(key)) return { ok: false as const, error: "Action inconnue." };

  const supabase = await createClient();
  const data = await loadGeoActionData(supabase);
  const action = data.candidates.find((a) => a.key === key);
  if (!action?.article) return { ok: false as const, error: "Pas d'article associé à cette action." };

  try {
    return { ok: true as const, text: await draftOutreach(action.article) };
  } catch (e) {
    console.error("[draftGeoOutreach] failed:", e);
    return { ok: false as const, error: "Le brouillon n'a pas pu être rédigé. Réessaie dans un instant." };
  }
}
