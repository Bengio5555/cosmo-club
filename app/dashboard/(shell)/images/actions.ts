"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Config, ImageConfig } from "@/types/admin";

const CONFIG_PATH = join(process.cwd(), "public", "images-config.json");
const STORAGE_BUCKET = "cosmoclub-images";

/** Ensure the caller is signed in to the dashboard. */
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

/**
 * Dashboard view of the site's image config: static slots from
 * `public/images-config.json`, merged with admin uploads now living
 * in the Supabase Storage `cosmoclub-images` bucket, plus the
 * per-slot editorial overrides from the `image_overrides` table.
 */
export async function loadDashboardImagesConfig(): Promise<Config> {
  await requireAuth();

  let config: Config = { pages: {} };
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    config = JSON.parse(raw) as Config;
  } catch (err) {
    console.warn("[loadDashboardImagesConfig] read static failed:", err);
    config = { pages: {} };
  }

  try {
    const adminSupabase = createAdminClient();
    const { data: files, error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
    if (error) throw error;
    if (files && files.length > 0) {
      if (!config.pages.evenements) config.pages.evenements = {};
      for (const file of files) {
        if (!file.name || file.name === ".emptyFolderPlaceholder") continue;
        const { data: pub } = adminSupabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(file.name);
        const publicUrl = pub.publicUrl;

        const prefixMatch = file.name.match(/^([^_]+)__([^_]+)__(.+)$/);
        if (prefixMatch) {
          const [, page, key] = prefixMatch;
          if (!config.pages[page]) config.pages[page] = {};
          const existing = config.pages[page][key] || ({} as ImageConfig);
          config.pages[page][key] = {
            ...existing,
            path: publicUrl,
          } as ImageConfig;
          continue;
        }

        const key = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/\W+/g, "-")
          .toLowerCase();
        if (!config.pages.evenements[key]) {
          config.pages.evenements[key] = {
            title: file.name.replace(/\.[^.]+$/, ""),
            path: publicUrl,
            orientation: "portrait",
            section: "Galerie Événements",
            label: "Événement",
          };
        }
      }
    }
  } catch (err) {
    console.warn("[loadDashboardImagesConfig] Storage list failed:", err);
  }

  // Apply per-slot editorial overrides on top.
  try {
    const supabase = await createClient();
    const { data: overrides } = await supabase
      .from("image_overrides")
      .select("page,image_key,title,label,orientation");
    for (const o of overrides ?? []) {
      const slot = config.pages[o.page]?.[o.image_key];
      if (!slot) continue;
      if (o.title) slot.title = o.title;
      if (o.label) slot.label = o.label;
      if (
        o.orientation === "portrait" ||
        o.orientation === "landscape" ||
        o.orientation === "square"
      ) {
        slot.orientation = o.orientation;
      }
    }
  } catch (err) {
    console.warn("[loadDashboardImagesConfig] overrides merge failed:", err);
  }

  return config;
}

/** Patch one slot's editorial metadata (title / orientation / label). */
export async function updateImageSlot(
  page: string,
  key: string,
  patch: Partial<Pick<ImageConfig, "title" | "orientation" | "label">>,
) {
  await requireAuth();

  if (!page || !key) {
    return { ok: false as const, error: "Slot invalide." };
  }

  const supabase = await createClient();
  const upsert: {
    page: string;
    image_key: string;
    title?: string | null;
    label?: string | null;
    orientation?: string | null;
    updated_at: string;
  } = {
    page,
    image_key: key,
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) upsert.title = patch.title;
  if (patch.label !== undefined) upsert.label = patch.label;
  if (patch.orientation !== undefined) upsert.orientation = patch.orientation;

  const { error } = await supabase
    .from("image_overrides")
    .upsert(upsert, { onConflict: "page,image_key" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/dashboard/images");
  revalidatePath("/");
  revalidatePath("/evenements");
  return { ok: true as const };
}

/**
 * Upload one file via the dashboard. Routes to a specific slot when
 * `targetPage` + `targetKey` are provided (filename is prefixed
 * `{page}__{key}__`); otherwise lands in the evenements gallery.
 */
export async function uploadDashboardImage(formData: FormData) {
  await requireAuth();

  const file = formData.get("file");
  const targetPage = formData.get("targetPage")?.toString() || null;
  const targetKey = formData.get("targetKey")?.toString() || null;

  if (!(file instanceof File))
    return { ok: false as const, error: "Fichier manquant." };
  if (!file.type.startsWith("image/"))
    return { ok: false as const, error: "Le fichier doit être une image." };
  if (file.size > 10 * 1024 * 1024)
    return { ok: false as const, error: "Image trop lourde (max 10 Mo)." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const slug =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "image";
  const base = `${slug}-${Date.now()}.${ext}`;
  const filename =
    targetPage && targetKey ? `${targetPage}__${targetKey}__${base}` : base;

  try {
    const adminSupabase = createAdminClient();
    const buffer = await file.arrayBuffer();
    const { error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });
    if (error) {
      return { ok: false as const, error: error.message };
    }
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec d'upload.",
    };
  }

  revalidatePath("/dashboard/images");
  // Revalidate every public page that pulls from the image config so a
  // hero/bento/lattes/event-tile change shows up immediately. Without
  // this, only `/` was revalidated and `/bar-a-cocktails`, `/barista`,
  // `/evenements` kept serving the previous build's cached HTML.
  for (const path of ["/", "/bar-a-cocktails", "/barista", "/evenements", "/concept"]) {
    revalidatePath(path);
  }
  return { ok: true as const };
}

/**
 * Hard delete from Supabase Storage. The proxy URL accepted here is
 * either a Supabase public URL or the legacy `/api/admin/image-proxy`
 * one — we extract the filename from whichever form was passed.
 */
export async function deleteDashboardImageByProxy(proxyUrl: string) {
  await requireAuth();

  let filename: string;
  try {
    if (proxyUrl.includes("/storage/v1/object/public/")) {
      const u = new URL(proxyUrl);
      const parts = u.pathname.split("/");
      filename = decodeURIComponent(parts[parts.length - 1]);
    } else if (proxyUrl.includes("/api/admin/image-proxy")) {
      // Legacy: blob URL hidden in the proxy URL's `url` param.
      const u = new URL(proxyUrl, "https://example.com");
      const enc = u.searchParams.get("url");
      if (!enc) throw new Error("URL invalide");
      const blobUrl = Buffer.from(enc, "base64").toString("utf-8");
      filename = blobUrl.split("/").pop() ?? "";
    } else {
      throw new Error("URL non reconnue");
    }
    if (!filename) throw new Error("Nom de fichier introuvable");
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error ? err.message : "Impossible de décoder l'URL.",
    };
  }

  try {
    const adminSupabase = createAdminClient();
    const { error } = await adminSupabase.storage
      .from(STORAGE_BUCKET)
      .remove([filename]);
    if (error)
      return { ok: false as const, error: error.message };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec de suppression.",
    };
  }

  revalidatePath("/dashboard/images");
  for (const path of ["/", "/bar-a-cocktails", "/barista", "/evenements", "/concept"]) {
    revalidatePath(path);
  }
  return { ok: true as const };
}
