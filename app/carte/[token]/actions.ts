"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public: the client submits the cocktails they picked. Token-gated,
 * service-role client (no session). Only a 'sent' proposal accepts an
 * answer, only proposed cocktails are accepted, within max_choices.
 */
export async function submitMenuChoice(token: string, chosenIds: string[]) {
  if (!/^[0-9a-f-]{36}$/i.test(token)) return { ok: false as const, error: "Lien invalide." };
  const supabase = createAdminClient();

  const { data: prop } = await supabase
    .from("quote_menu_proposals")
    .select("id,quote_id,status,cocktail_ids,max_choices")
    .eq("access_token", token)
    .maybeSingle();
  if (!prop) return { ok: false as const, error: "Carte introuvable." };
  if (prop.status !== "sent") return { ok: false as const, error: "Cette carte a déjà été validée." };

  const allowed = new Set(prop.cocktail_ids);
  const chosen = Array.from(new Set(chosenIds.filter((id) => typeof id === "string" && allowed.has(id))));
  if (chosen.length === 0) return { ok: false as const, error: "Choisissez au moins un cocktail." };
  if (chosen.length > prop.max_choices) {
    return { ok: false as const, error: `Vous pouvez choisir au maximum ${prop.max_choices} cocktail${prop.max_choices > 1 ? "s" : ""}.` };
  }

  const { error } = await supabase
    .from("quote_menu_proposals")
    .update({ status: "answered", chosen_ids: chosen, answered_at: new Date().toISOString() })
    .eq("id", prop.id)
    .eq("status", "sent");
  if (error) return { ok: false as const, error: error.message };

  // Surface the answer where the team works: the quote and its event(s).
  revalidatePath(`/carte/${token}`);
  revalidatePath(`/dashboard/devis/${prop.quote_id}`);
  revalidatePath("/dashboard/devis");
  const { data: evs } = await supabase.from("events").select("id").eq("quote_id", prop.quote_id);
  for (const e of evs ?? []) revalidatePath(`/dashboard/events/${e.id}`);
  revalidatePath("/dashboard/events");
  return { ok: true as const };
}
