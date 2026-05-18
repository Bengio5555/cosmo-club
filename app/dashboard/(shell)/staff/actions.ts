"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type StaffRole = Database["public"]["Enums"]["staff_role"];

export type StaffInput = {
  full_name: string;
  role: StaffRole;
  hourly_rate: number | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

function clean(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t || null;
}

function normalize(input: StaffInput): StaffInput {
  return {
    full_name: input.full_name.trim(),
    role: input.role,
    hourly_rate:
      input.hourly_rate == null || !Number.isFinite(Number(input.hourly_rate))
        ? null
        : Number(input.hourly_rate),
    email: clean(input.email)?.toLowerCase() ?? null,
    phone: clean(input.phone),
    notes: clean(input.notes),
  };
}

export async function saveNewStaff(input: StaffInput) {
  const supabase = await createClient();
  const v = normalize(input);
  if (!v.full_name) {
    return { ok: false as const, error: "Nom complet requis." };
  }
  const { data, error } = await supabase
    .from("staff")
    .insert(v)
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Création échouée" };
  }
  revalidatePath("/dashboard/staff");
  return { ok: true as const, id: data.id };
}

export async function saveStaff(id: string, input: Partial<StaffInput>) {
  const supabase = await createClient();
  const patch: Partial<StaffInput> = {};
  if (input.full_name !== undefined) patch.full_name = input.full_name.trim();
  if (input.role !== undefined) patch.role = input.role;
  if (input.hourly_rate !== undefined)
    patch.hourly_rate = input.hourly_rate == null ? null : Number(input.hourly_rate);
  if (input.email !== undefined) patch.email = clean(input.email)?.toLowerCase() ?? null;
  if (input.phone !== undefined) patch.phone = clean(input.phone);
  if (input.notes !== undefined) patch.notes = clean(input.notes);

  const { error } = await supabase.from("staff").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}

export async function toggleStaffArchived(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("staff")
    .update({ archived })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}

/**
 * Hard delete a staff member. Fails (FK violation) if the person is
 * still attached to any past event via `event_staff`. In that case the
 * UI should suggest archiving instead.
 */
export async function deleteStaff(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return {
        ok: false as const,
        error:
          "Impossible de supprimer : ce membre est lié à un ou plusieurs événements. Archive-le pour le masquer sans casser l'historique.",
      };
    }
    return { ok: false as const, error: error.message };
  }
  revalidatePath("/dashboard/staff");
  return { ok: true as const };
}
