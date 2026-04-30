"use server";

import { revalidatePath } from "next/cache";
import { readFile, writeFile } from "node:fs/promises";
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
 * `public/images-config.json` (the static slot map) and merges in
 * Vercel Blob uploads. The blob URLs are wrapped in
 * `/api/admin/image-proxy` so the same authenticated reader path
 * everything else uses delivers them.
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

  return config;
}

/**
 * Patch one slot's editable metadata (title / orientation / label).
 * The static portion of the config lives in
 * `public/images-config.json`; on Vercel that filesystem is read-only
 * outside of the build, so on prod this returns a structured warning
 * the UI can show — admin still works locally and the metadata can
 * be checked in via git.
 */
export async function updateImageSlot(
  page: string,
  key: string,
  patch: Partial<Pick<ImageConfig, "title" | "orientation" | "label">>,
) {
  await requireAuth();

  let config: Config;
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    config = JSON.parse(raw) as Config;
  } catch {
    config = { pages: {} };
  }

  if (!config.pages[page]) config.pages[page] = {};
  const existing = config.pages[page][key] ?? {
    title: key,
    path: "",
    orientation: "landscape",
    section: page,
    label: "Événement",
  };
  config.pages[page][key] = { ...existing, ...patch } as ImageConfig;

  try {
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    return {
      ok: false as const,
      readOnly: true,
      error:
        err instanceof Error ? err.message : "Système de fichiers en lecture seule.",
    };
  }

  revalidatePath("/dashboard/images");
  revalidatePath("/");
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
