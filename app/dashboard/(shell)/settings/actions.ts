"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

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
