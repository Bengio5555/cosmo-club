"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  emptyBriefing,
  parseBriefing,
  type BriefingData,
} from "@/lib/server/briefingPreset";
import type { Database } from "@/types/database";

type EventsUpdate = Database["public"]["Tables"]["events"]["Update"];

/**
 * One-shot initialiser: turns the event into a briefing-ready record.
 * Writes the preset payload + mints a public access token (UUID) that
 * gates the shareable /briefing/[id]?t=… URL. Safe to call repeatedly
 * — if briefing_token already exists, we keep it (so previously sent
 * WhatsApp links stay valid).
 */
export async function createBriefing(eventId: string) {
  const supabase = await createClient();

  const { data: existing, error: readErr } = await supabase
    .from("events")
    .select("id,briefing_token,briefing_data")
    .eq("id", eventId)
    .maybeSingle();
  if (readErr || !existing) {
    return {
      ok: false as const,
      error: readErr?.message ?? "Événement introuvable",
    };
  }

  const patch: EventsUpdate = {};
  if (!existing.briefing_data) {
    patch.briefing_data = emptyBriefing() as unknown as EventsUpdate["briefing_data"];
  }
  if (!existing.briefing_token) {
    patch.briefing_token = crypto.randomUUID();
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true as const };
  }

  const { error: upErr } = await supabase
    .from("events")
    .update(patch)
    .eq("id", eventId);
  if (upErr) {
    return { ok: false as const, error: upErr.message };
  }

  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/briefing`);
  return { ok: true as const };
}

/** Persist the edited briefing payload. Always overwrites the whole
 *  JSONB blob — the editor sends a complete BriefingData. */
export async function saveBriefing(eventId: string, data: BriefingData) {
  const supabase = await createClient();
  // Sanitise via the parser so we never persist anything the type
  // contract didn't agree to.
  const safe = parseBriefing(data);
  const { error } = await supabase
    .from("events")
    .update({
      briefing_data: safe as unknown as EventsUpdate["briefing_data"],
    })
    .eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}/briefing`);
  return { ok: true as const };
}

/** Mint a fresh access token. Use when the previous link leaked or
 *  the operator wants to revoke access from former staff. */
export async function rotateBriefingToken(eventId: string) {
  const supabase = await createClient();
  const next = crypto.randomUUID();
  const { error } = await supabase
    .from("events")
    .update({ briefing_token: next })
    .eq("id", eventId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/dashboard/events/${eventId}/briefing`);
  return { ok: true as const, token: next };
}
