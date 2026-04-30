"use server";

import { revalidatePath } from "next/cache";
import { put, del } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";

/**
 * Upload one client logo to Vercel Blob and persist a row in
 * `client_logos`. The form posts a `name` and a `file`. Position
 * defaults to "after the last existing one" so the marquee order
 * stays stable as the owner adds logos.
 */
export async function uploadClientLogo(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("file");
  if (!name) return { ok: false as const, error: "Nom requis." };
  if (!(file instanceof File))
    return { ok: false as const, error: "Fichier manquant." };
  if (!file.type.startsWith("image/"))
    return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > 2 * 1024 * 1024)
    return { ok: false as const, error: "Image trop lourde (max 2 Mo)." };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken)
    return { ok: false as const, error: "Stockage blob non configuré." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "logo";
  const filename = `${slug}-${Date.now()}.${ext}`;

  let blobUrl = "";
  try {
    const blob = await put(`cosmo-club/client-logos/${filename}`, file, {
      access: "private",
      token: blobToken,
    });
    blobUrl = blob.url;
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec d'upload blob.",
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
    blob_url: blobUrl,
    position: nextPosition,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/logos");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Hard delete: drops the DB row and removes the underlying blob.
 * Failure on the blob side is logged but doesn't block the row
 * deletion — the marquee never queries the blob directly so a stale
 * file is harmless.
 */
export async function deleteClientLogo(id: string) {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("client_logos")
    .select("blob_url")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false as const, error: "Logo introuvable." };

  const { error } = await supabase.from("client_logos").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken && row.blob_url) {
    try {
      await del(row.blob_url, { token: blobToken });
    } catch (err) {
      console.warn("[deleteClientLogo] blob del failed:", err);
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
    return { ok: true as const }; // already at boundary, no-op
  }

  // Renumber sequentially first so we always have a stable ordering
  // even if the source data was sparse, then swap the two targets.
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
