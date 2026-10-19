"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/types/database";
import {
  EQUIPMENT_CATEGORIES,
  normalizeCode,
  type EquipmentCategory,
} from "@/lib/equipment/shared";

type EquipmentUpdate = TablesUpdate<"equipment">;

export type EquipmentInput = {
  code: string;
  name: string;
  category: EquipmentCategory;
  contents: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function validate(input: Partial<EquipmentInput>): string | null {
  if (input.code !== undefined) {
    const code = normalizeCode(input.code);
    if (code.length < 2 || code.length > 24) return "Code : entre 2 et 24 caractères.";
  }
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name.length < 2 || name.length > 80) return "Nom : entre 2 et 80 caractères.";
  }
  if (input.category !== undefined && !EQUIPMENT_CATEGORIES.includes(input.category)) {
    return "Catégorie inconnue.";
  }
  return null;
}

function friendly(message: string): string {
  if (/equipment_code_key|duplicate key/i.test(message)) {
    return "Ce code existe déjà : choisis-en un autre.";
  }
  return message;
}

export async function createEquipment(input: EquipmentInput) {
  const err = validate(input);
  if (err) return { ok: false as const, error: err };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert({
      code: normalizeCode(input.code),
      name: input.name.trim(),
      category: input.category,
      contents: clean(input.contents),
    })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: friendly(error?.message ?? "Création échouée") };
  }
  revalidatePath("/dashboard/materiel");
  return { ok: true as const, id: data.id };
}

export async function updateEquipment(id: string, input: Partial<EquipmentInput>) {
  const err = validate(input);
  if (err) return { ok: false as const, error: err };
  const patch: EquipmentUpdate = {};
  if (input.code !== undefined) patch.code = normalizeCode(input.code);
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.category !== undefined) patch.category = input.category;
  if (input.contents !== undefined) patch.contents = clean(input.contents);
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: friendly(error.message) };
  revalidatePath("/dashboard/materiel");
  return { ok: true as const };
}

/** Archiving keeps the history (scans, past events) and hides the element
 *  from new selections. The printed label keeps working: the public page
 *  says the element is retired. */
export async function setEquipmentArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("equipment").update({ archived }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/materiel");
  return { ok: true as const };
}

/** Only for an element that was never used: deleting one with history
 *  would orphan scans, so the UI offers archiving instead. */
export async function deleteEquipment(id: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("event_equipment")
    .select("event_id", { count: "exact", head: true })
    .eq("equipment_id", id);
  if ((count ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Cet élément a déjà été affecté à un événement : archive-le plutôt.",
    };
  }
  const { error } = await supabase.from("equipment").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/materiel");
  return { ok: true as const };
}
