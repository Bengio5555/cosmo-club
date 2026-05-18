"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PartnerInput = {
  category: string;
  name: string;
  contact_name: string | null;
  position: string | null;
  email: string | null;
  email_alt: string | null;
  phone: string | null;
  notes: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function normalize(input: PartnerInput): PartnerInput {
  return {
    category: input.category.trim(),
    name: input.name.trim(),
    contact_name: clean(input.contact_name),
    position: clean(input.position),
    email: clean(input.email)?.toLowerCase() ?? null,
    email_alt: clean(input.email_alt)?.toLowerCase() ?? null,
    phone: clean(input.phone),
    notes: clean(input.notes),
  };
}

export async function saveNewPartner(input: PartnerInput) {
  const supabase = await createClient();
  const v = normalize(input);
  if (!v.category) return { ok: false as const, error: "Catégorie requise." };
  if (!v.name) return { ok: false as const, error: "Nom requis." };
  const { data, error } = await supabase.from("partners").insert(v).select("id").single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Création échouée" };
  revalidatePath("/dashboard/partners");
  return { ok: true as const, id: data.id };
}

export async function savePartner(id: string, input: Partial<PartnerInput>) {
  const supabase = await createClient();
  const patch: Partial<PartnerInput> = {};
  for (const k of Object.keys(input) as (keyof PartnerInput)[]) {
    if (input[k] === undefined) continue;
    if (k === "category" || k === "name") {
      patch[k] = String(input[k] ?? "").trim();
    } else if (k === "email" || k === "email_alt") {
      patch[k] = clean(input[k] as string | null)?.toLowerCase() ?? null;
    } else {
      patch[k] = clean(input[k] as string | null) as never;
    }
  }
  const { error } = await supabase.from("partners").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/partners");
  return { ok: true as const };
}

export async function togglePartnerArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("partners").update({ archived }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/partners");
  return { ok: true as const };
}

export async function deletePartner(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("partners").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/partners");
  return { ok: true as const };
}
