"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { normalizeGoogleReviewUrl } from "@/lib/reviewUrl";

/**
 * Generate (or rotate) the iCalendar subscription token. The token is
 * the only gate on /calendar/{token}, so rotating it here invalidates
 * any URL the owner had previously copied — useful if it leaked.
 */
export async function rotateCalendarToken() {
  const supabase = await createClient();
  // 24 random bytes → 32-char base64url. Long enough to be
  // unguessable, short enough to fit comfortably in a clipboard.
  const token = randomBytes(24)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const { error } = await supabase
    .from("settings")
    .update({ calendar_token: token })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/settings");
  return { ok: true as const, token };
}

/** Disable sharing entirely by clearing the token. */
export async function clearCalendarToken() {
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ calendar_token: null })
    .eq("id", 1);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/settings");
  return { ok: true as const };
}

/**
 * Lien « laisser un avis » Google, utilisé par /dashboard/avis. Vide =
 * désactivé. Seuls les liens Google en https passent (voir lib/reviewUrl).
 */
export async function saveGoogleReviewUrl(raw: string) {
  const trimmed = raw.trim();
  const url = trimmed ? normalizeGoogleReviewUrl(trimmed) : null;
  if (trimmed && !url) {
    return {
      ok: false as const,
      error: "Lien refusé : colle le lien « Demander des avis » de ta fiche Google (https://g.page/… ou https://search.google.com/…).",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("settings")
    .update({ google_review_url: url })
    .eq("id", 1)
    .select("id");
  if (error) return { ok: false as const, error: error.message };
  if (!data || data.length === 0) return { ok: false as const, error: "Accès refusé." };

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/avis");
  return { ok: true as const, url };
}
