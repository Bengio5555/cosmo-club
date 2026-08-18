"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "cosmoclub-logos";

/**
 * Authorization gate. `/dashboard/logos` is owner/admin-only
 * (ROUTE_ROLES), but these actions write to Storage via the
 * RLS-bypassing admin client and can be invoked outside the proxy — so
 * each re-checks the caller is a signed-in owner/admin before mutating.
 */
async function requireLogoAdmin(): Promise<{ ok: false; error: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Non authentifié." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role;
  if (role !== "owner" && role !== "admin") {
    return { ok: false as const, error: "Accès refusé." };
  }
  return null;
}

/**
 * Upload one client logo to Supabase Storage and persist a row in
 * `client_logos`. Position defaults to "after the last existing one"
 * so the marquee order stays stable as new logos are added.
 */
export async function uploadClientLogo(formData: FormData) {
  const denied = await requireLogoAdmin();
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");
  if (!name) return { ok: false as const, error: "Nom requis." };
  if (!(file instanceof File))
    return { ok: false as const, error: "Fichier manquant." };
  if (!file.type.startsWith("image/"))
    return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > 2 * 1024 * 1024)
    return { ok: false as const, error: "Image trop lourde (max 2 Mo)." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const slug =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "logo";
  const filename = `${slug}-${Date.now()}.${ext}`;

  let publicUrl = "";
  try {
    const adminSupabase = createAdminClient();
    const buffer = await file.arrayBuffer();
    const { error: upErr } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
        cacheControl: "31536000",
      });
    if (upErr) return { ok: false as const, error: upErr.message };
    publicUrl = adminSupabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
      .data.publicUrl;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec d'upload.",
    };
  }

  const supabase = await createClient();
  const { data: max } = await supabase
    .from("client_logos")
    .select("position")
    .eq("archived", false)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextPosition = (max?.position ?? -1) + 1;

  const { error } = await supabase.from("client_logos").insert({
    name,
    blob_url: publicUrl,
    position: nextPosition,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/logos");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Hard delete: drops the DB row and removes the underlying Storage
 * object. The Storage delete is best-effort — the public site doesn't
 * query the bucket directly so a stale file is harmless.
 */
export async function deleteClientLogo(id: string) {
  const denied = await requireLogoAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("client_logos")
    .select("blob_url")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Logo introuvable." };

  const { error } = await supabase.from("client_logos").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  if (row.blob_url) {
    try {
      const adminSupabase = createAdminClient();
      // Storage row only carries the filename — extract from the
      // public URL (`.../storage/v1/object/public/<bucket>/<filename>`).
      const parts = String(row.blob_url).split("/");
      const filename = parts[parts.length - 1];
      if (filename) {
        await adminSupabase.storage.from(STORAGE_BUCKET).remove([filename]);
      }
    } catch (err) {
      console.warn("[deleteClientLogo] storage remove failed:", err);
    }
  }

  revalidatePath("/dashboard/logos");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Reorder helper — called from the admin grid drag-handle. Position
 * lower = displayed first.
 */
export async function moveClientLogo(id: string, direction: "up" | "down") {
  const denied = await requireLogoAdmin();
  if (denied) return denied;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("client_logos")
    .select("id,position")
    .eq("archived", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (!rows) return { ok: false as const, error: "Aucune ligne." };

  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false as const, error: "Logo introuvable." };
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (swapWith < 0 || swapWith >= rows.length) {
    return { ok: true as const };
  }

  const ordered = rows.map((r, i) => ({ id: r.id, position: i }));
  const a = ordered[idx];
  const b = ordered[swapWith];
  ordered[idx] = { id: a.id, position: b.position };
  ordered[swapWith] = { id: b.id, position: a.position };

  for (const r of ordered) {
    await supabase
      .from("client_logos")
      .update({ position: r.position })
      .eq("id", r.id);
  }

  revalidatePath("/dashboard/logos");
  revalidatePath("/");
  return { ok: true as const };
}
