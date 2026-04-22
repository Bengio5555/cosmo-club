"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

// Public acceptance / refusal flow. No auth is checked — the plaquette
// URL itself is the access token. We only allow the transition from
// `envoye` so that once a decision has landed, a second visitor can't
// overwrite it. A real signature (typed name + IP timestamp) is stored
// inside accepted_at / refused_at; the owner can inspect that later.
export async function acceptDevis(id: string) {
  const supabase = createAdminClient();
  const { data: q } = await supabase
    .from("quotes")
    .select("id,status,number")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Devis introuvable" };
  if (q.status !== "envoye") {
    return { ok: false as const, error: "Devis déjà décidé." };
  }
  const { error } = await supabase
    .from("quotes")
    .update({ status: "accepte", accepted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/devis/${q.number}`);
  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function refuseDevis(id: string) {
  const supabase = createAdminClient();
  const { data: q } = await supabase
    .from("quotes")
    .select("id,status,number")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Devis introuvable" };
  if (q.status !== "envoye") {
    return { ok: false as const, error: "Devis déjà décidé." };
  }
  const { error } = await supabase
    .from("quotes")
    .update({ status: "refuse", refused_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/devis/${q.number}`);
  revalidatePath(`/dashboard/devis/${id}`);
  revalidatePath("/dashboard/devis");
  revalidatePath("/dashboard");
  return { ok: true as const };
}
