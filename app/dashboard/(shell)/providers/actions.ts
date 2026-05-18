"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProviderInput = {
  category: string;
  service_type: string | null;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  pricing_info: string | null;
  file_url: string | null;
  notes: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function normalize(input: ProviderInput): ProviderInput {
  return {
    category: input.category.trim(),
    service_type: clean(input.service_type),
    company_name: clean(input.company_name),
    contact_name: clean(input.contact_name),
    email: clean(input.email)?.toLowerCase() ?? null,
    phone: clean(input.phone),
    website: clean(input.website),
    pricing_info: clean(input.pricing_info),
    file_url: clean(input.file_url),
    notes: clean(input.notes),
  };
}

export async function saveNewProvider(input: ProviderInput) {
  const supabase = await createClient();
  const v = normalize(input);
  if (!v.category) return { ok: false as const, error: "Catégorie requise." };
  if (!v.company_name && !v.contact_name && !v.service_type) {
    return { ok: false as const, error: "Au moins un nom (société, contact ou service) requis." };
  }
  const { data, error } = await supabase.from("providers").insert(v).select("id").single();
  if (error || !data) return { ok: false as const, error: error?.message ?? "Création échouée" };
  revalidatePath("/dashboard/providers");
  return { ok: true as const, id: data.id };
}

export async function saveProvider(id: string, input: Partial<ProviderInput>) {
  const supabase = await createClient();
  const patch: Partial<ProviderInput> = {};
  for (const k of Object.keys(input) as (keyof ProviderInput)[]) {
    if (input[k] === undefined) continue;
    if (k === "category") patch.category = String(input.category ?? "").trim();
    else if (k === "email") patch.email = clean(input.email as string | null)?.toLowerCase() ?? null;
    else patch[k] = clean(input[k] as string | null) as never;
  }
  const { error } = await supabase.from("providers").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/providers");
  return { ok: true as const };
}

export async function toggleProviderArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("providers").update({ archived }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/providers");
  return { ok: true as const };
}

export async function deleteProvider(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("providers").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/providers");
  return { ok: true as const };
}
