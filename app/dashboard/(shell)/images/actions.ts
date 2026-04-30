"use server";

import { revalidatePath } from "next/cache";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { put, list, del } from "@vercel/blob";
import { createClient } from "@/lib/supabase/server";
import type { Config, ImageConfig } from "@/types/admin";

const CONFIG_PATH = join(process.cwd(), "public", "images-config.json");

/** Helper: ensure the caller is signed in to the dashboard. Server
 * actions run server-side so they share the same Supabase session
 * cookie as the rest of the dashboard — this is the only auth gate
 * needed; the legacy x-admin-password header is no longer used. */
async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}

/**
 * Server-side equivalent of /api/admin/images-full. Reads
 * `public/images-config.json` (the static slot map), merges in
 * Vercel Blob uploads, then overlays the per-image editorial
 * overrides stored in `image_overrides` (DB). The blob URLs are
 * wrapped in `/api/admin/image-proxy` so the same authenticated
 * reader path everything else uses delivers them.
 */
export async function loadDashboardImagesConfig(): Promise<Config> {
  const user = await requireAuth();
  void user;

  let config: Config = { pages: {} };
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    config = JSON.parse(raw) as Config;
  } catch (err) {
    console.warn("[loadDashboardImagesConfig] read static failed:", err);
    config = { pages: {} };
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return config;

  try {
    const blobs = await list({
      prefix: "cosmo-club/images/",
      token: blobToken,
    });
    if (!blobs.blobs?.length) return config;

    if (!config.pages.evenements) config.pages.evenements = {};

    const sorted = [...blobs.blobs].sort((a, b) => {
      const ta = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const tb = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return ta - tb;
    });

    for (const blob of sorted) {
      const filename = blob.pathname.split("/").pop() || "";
      const encodedUrl = Buffer.from(blob.url).toString("base64");
      const proxyUrl = `/api/admin/image-proxy?url=${encodedUrl}`;

      const prefixMatch = filename.match(/^([^_]+)__([^_]+)__(.+)$/);
      if (prefixMatch) {
        const [, page, key] = prefixMatch;
        if (!config.pages[page]) config.pages[page] = {};
        const existing = config.pages[page][key] || ({} as ImageConfig);
        config.pages[page][key] = {
          ...existing,
          path: proxyUrl,
        } as ImageConfig;
        continue;
      }

      const key = filename
        .replace(/\.[^.]+$/, "")
        .replace(/\W+/g, "-")
        .toLowerCase();
      if (!config.pages.evenements[key]) {
        config.pages.evenements[key] = {
          title: filename.replace(/\.[^.]+$/, ""),
          path: proxyUrl,
          orientation: "portrait",
          section: "Galerie Événements",
          label: "Événement",
        };
      }
    }
  } catch (err) {
    console.warn("[loadDashboardImagesConfig] blob list failed:", err);
  }

  // Apply DB overrides on top so the admin sees the latest editorial
  // metadata even though images-config.json is read-only in prod.
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

/**
 * Patch one slot's editable metadata (title / orientation / label).
 * Persisted in `image_overrides` (DB). The actual image path stays
 * driven by static config + Vercel Blob — only the editorial
 * metadata is overlaid on top, so this works in prod without the
 * filesystem being writable.
 */
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
 * Upload one file to Vercel Blob. Optional `targetPage` + `targetKey`
 * route the blob into a specific slot via the `{page}__{key}__`
 * prefix the readers expect; otherwise the upload lands in the
 * evenements gallery.
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
  if (file.size > 8 * 1024 * 1024)
    return { ok: false as const, error: "Image trop lourde (max 8 Mo)." };

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken)
    return { ok: false as const, error: "Stockage blob non configuré." };

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
    await put(`cosmo-club/images/${filename}`, file, {
      access: "private",
      token: blobToken,
    });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec d'upload blob.",
    };
  }

  revalidatePath("/dashboard/images");
  revalidatePath("/");
  return { ok: true as const };
}

/**
 * Hard delete: removes the blob behind a proxy URL the admin shows.
 * The image's static-config slot is *not* touched — it'll just have
 * a stale `path` until the owner replaces it. That's intentional:
 * losing the blob reference is the only thing we need to fix here,
 * the metadata can stay.
 */
export async function deleteDashboardImageByProxy(proxyUrl: string) {
  await requireAuth();

  // Pull the blob URL out of `/api/admin/image-proxy?url=BASE64`.
  let blobUrl: string;
  try {
    const u = new URL(proxyUrl, "https://example.com");
    const enc = u.searchParams.get("url");
    if (!enc) throw new Error("URL invalide");
    blobUrl = Buffer.from(enc, "base64").toString("utf-8");
  } catch (err) {
    return {
      ok: false as const,
      error:
        err instanceof Error ? err.message : "Impossible de décoder l'URL.",
    };
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken)
    return { ok: false as const, error: "Stockage blob non configuré." };

  try {
    await del(blobUrl, { token: blobToken });
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Échec de suppression.",
    };
  }

  revalidatePath("/dashboard/images");
  revalidatePath("/");
  return { ok: true as const };
}
