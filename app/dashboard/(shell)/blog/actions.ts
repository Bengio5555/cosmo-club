"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canAccess } from "@/lib/auth/roles";
import {
  generateGmbPost,
  generateArticleCover,
  generateGmbCover,
  generateArticleDraft,
  type ArticleBrief,
  type GeneratedArticle,
} from "@/lib/blog/ai";
import type { ArticleStatus } from "./types";

const STORAGE_BUCKET = "cosmoclub-articles";

type ActionOk<T = undefined> = { ok: true } & (T extends undefined ? object : { data: T });
type ActionErr = { ok: false; error: string };
type ActionResult<T = undefined> = ActionOk<T> | ActionErr;

async function requireBlogAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profile?.role ?? null;
  if (!canAccess("/dashboard/blog", role)) {
    return { error: "Accès refusé pour ce rôle." };
  }
  return { userId: user.id };
}

type ArticlePayload = {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  cover_url: string | null;
  reading_time: string | null;
  keywords: string[];
  tags: string[];
  status: ArticleStatus;
  publish_at: string;
};

function readPayload(form: FormData): ArticlePayload {
  const raw = (key: string) => (form.get(key) ?? "").toString();
  const csv = (key: string) =>
    raw(key)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return {
    slug: raw("slug").trim(),
    title: raw("title").trim(),
    description: raw("description").trim(),
    body_md: raw("body_md"),
    cover_url: raw("cover_url").trim() || null,
    reading_time: raw("reading_time").trim() || null,
    keywords: csv("keywords"),
    tags: csv("tags"),
    status: (raw("status") as ArticleStatus) || "draft",
    publish_at: raw("publish_at").trim() || new Date().toISOString(),
  };
}

function validate(p: ArticlePayload): string | null {
  if (!p.title) return "Titre manquant.";
  if (!p.slug) return "Slug manquant.";
  if (!/^[a-z0-9-]+$/.test(p.slug)) return "Slug invalide (a-z, 0-9, tirets uniquement).";
  if (!p.description) return "Description manquante.";
  if (!p.body_md) return "Corps de l'article manquant.";
  if (!["draft", "scheduled", "published"].includes(p.status)) return "Statut invalide.";
  return null;
}

/**
 * Create or update an article. The admin client bypasses RLS — the
 * gate above is the auth check.
 */
export async function saveArticle(
  id: string | null,
  formData: FormData,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const payload = readPayload(formData);
  const validation = validate(payload);
  if (validation) return { ok: false, error: validation };

  const admin = createAdminClient();
  if (id) {
    const { data, error } = await admin
      .from("articles")
      .update(payload)
      .eq("id", id)
      .select("id, slug")
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? "Mise à jour échouée." };
    revalidatePath("/dashboard/blog");
    revalidatePath("/blog");
    revalidatePath(`/blog/${data.slug}`);
    revalidatePath(`/blog/${payload.slug}`);
    return { ok: true, data };
  }

  const { data, error } = await admin
    .from("articles")
    .insert({ ...payload, created_by: gate.userId })
    .select("id, slug")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Création échouée." };
  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${data.slug}`);
  return { ok: true, data };
}

/**
 * Save and redirect — used by the editor form so the page reloads on
 * the edit URL once the row exists. Returns a string error if
 * validation fails (the form keeps its state on failure).
 */
export async function saveAndContinue(
  id: string | null,
  formData: FormData,
): Promise<string | void> {
  const result = await saveArticle(id, formData);
  if (!result.ok) return result.error;
  redirect(`/dashboard/blog/${result.data.id}`);
}

export async function deleteArticle(id: string): Promise<ActionResult> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const admin = createAdminClient();
  // Fetch slug for revalidation
  const { data: row } = await admin.from("articles").select("slug").eq("id", id).single();
  const { error } = await admin.from("articles").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/blog");
  revalidatePath("/blog");
  if (row?.slug) revalidatePath(`/blog/${row.slug}`);
  return { ok: true };
}

/**
 * Upload a cover image to the cosmoclub-articles bucket. Returns the
 * public URL so the editor can preview it before the article is saved.
 */
export async function uploadCover(
  articleSlugHint: string,
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Aucun fichier reçu." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Fichier trop volumineux (5 Mo max)." };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const stamp = Date.now();
  const safeSlug = (articleSlugHint || "article").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  const path = `${safeSlug}/cover-${stamp}.${ext}`;

  const admin = createAdminClient();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from(STORAGE_BUCKET).upload(path, buf, {
    contentType: file.type || "image/png",
    upsert: true,
    cacheControl: "31536000",
  });
  if (upErr) return { ok: false, error: upErr.message };
  const { data: pub } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { ok: true, data: { url: pub.publicUrl } };
}

// ──────────────────────────────────────────────────────────────────────
// AI generation — Phase 2
// ──────────────────────────────────────────────────────────────────────

type LoadedArticle = {
  id: string;
  slug: string;
  title: string;
  description: string;
  body_md: string;
  tags: string[] | null;
  keywords: string[] | null;
};

async function loadArticleForAI(
  id: string,
): Promise<{ ok: true; article: LoadedArticle } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("articles")
    .select("id, slug, title, description, body_md, tags, keywords")
    .eq("id", id)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Article introuvable." };
  }
  return { ok: true, article: data as LoadedArticle };
}

/**
 * Generate the GMB-ready short rewrite via Claude and persist it on
 * the article row. The author can then copy it from the editor.
 */
export async function generateGmbVersion(
  id: string,
): Promise<ActionResult<{ post: string }>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const loaded = await loadArticleForAI(id);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  try {
    const post = await generateGmbPost(loaded.article);
    const admin = createAdminClient();
    const { error } = await admin
      .from("articles")
      .update({ gmb_post: post })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/blog/${id}`);
    return { ok: true, data: { post } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Claude inconnue.";
    return { ok: false, error: msg };
  }
}

async function uploadGeneratedImage(
  slug: string,
  filenamePrefix: "cover" | "gmb-cover",
  buf: Buffer,
  _mimeType: string,
): Promise<{ url: string } | { error: string }> {
  const safeSlug = (slug || "article").replace(/[^a-z0-9-]/gi, "-").toLowerCase();

  // Re-encode the Gemini PNG (~1.4 MB each) as WebP and constrain the
  // longest side to 1600 px. Quality 78 is a sweet spot — drops the
  // weight ~80% with no visible loss on editorial photo-realistic
  // covers. 4:3 (site) and 1:1 (GMB) ratios are preserved.
  const sharp = (await import("sharp")).default;
  const optimized = await sharp(buf, { failOn: "none" })
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toBuffer();

  const path = `${safeSlug}/${filenamePrefix}-ai-${Date.now()}.webp`;
  const admin = createAdminClient();
  const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, optimized, {
    contentType: "image/webp",
    upsert: true,
    cacheControl: "31536000", // 1 year — assets are content-hashed via timestamp
  });
  if (error) return { error: error.message };
  const { data: pub } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { url: pub.publicUrl };
}

/**
 * Generate the 4:3 article cover via Gemini, upload to Storage,
 * persist the public URL on the article row.
 */
export async function generateCoverImage(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const loaded = await loadArticleForAI(id);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  try {
    const result = await generateArticleCover(loaded.article);
    const uploaded = await uploadGeneratedImage(
      loaded.article.slug,
      "cover",
      result.bytes,
      result.mimeType,
    );
    if ("error" in uploaded) return { ok: false, error: uploaded.error };

    const admin = createAdminClient();
    const { error } = await admin
      .from("articles")
      .update({ cover_url: uploaded.url })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/blog/${id}`);
    return { ok: true, data: { url: uploaded.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Gemini inconnue.";
    return { ok: false, error: msg };
  }
}

/**
 * Batch-generate covers for every article that doesn't have one yet.
 * Sequential to avoid hammering Gemini and to keep error reporting clean.
 * Returns one entry per article processed so the UI can show what worked.
 */
export async function generateMissingCovers(): Promise<
  ActionResult<{
    generated: { id: string; slug: string; url: string }[];
    failed: { id: string; slug: string; error: string }[];
    skipped: number;
  }>
> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const admin = createAdminClient();
  const { data: targets, error: readErr } = await admin
    .from("articles")
    .select("id, slug")
    .is("cover_url", null)
    .order("publish_at", { ascending: false });
  if (readErr) return { ok: false, error: readErr.message };

  const generated: { id: string; slug: string; url: string }[] = [];
  const failed: { id: string; slug: string; error: string }[] = [];
  const skipped = 0;

  for (const target of targets ?? []) {
    const loaded = await loadArticleForAI(target.id);
    if (!loaded.ok) {
      failed.push({ id: target.id, slug: target.slug, error: loaded.error });
      continue;
    }
    try {
      const result = await generateArticleCover(loaded.article);
      const uploaded = await uploadGeneratedImage(
        loaded.article.slug,
        "cover",
        result.bytes,
        result.mimeType,
      );
      if ("error" in uploaded) {
        failed.push({ id: target.id, slug: target.slug, error: uploaded.error });
        continue;
      }
      const { error: upErr } = await admin
        .from("articles")
        .update({ cover_url: uploaded.url })
        .eq("id", target.id);
      if (upErr) {
        failed.push({ id: target.id, slug: target.slug, error: upErr.message });
        continue;
      }
      generated.push({ id: target.id, slug: target.slug, url: uploaded.url });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur Gemini inconnue.";
      failed.push({ id: target.id, slug: target.slug, error: msg });
    }
  }

  revalidatePath("/dashboard/blog");
  for (const g of generated) {
    revalidatePath(`/dashboard/blog/${g.id}`);
  }
  revalidatePath("/blog");
  return { ok: true, data: { generated, failed, skipped } };
}

/**
 * Generate the 1:1 GMB variant. Stored on gmb_cover_url so we don't
 * overwrite the site cover if the author already curated it.
 */
export async function generateGmbImage(
  id: string,
): Promise<ActionResult<{ url: string }>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  const loaded = await loadArticleForAI(id);
  if (!loaded.ok) return { ok: false, error: loaded.error };

  try {
    const result = await generateGmbCover(loaded.article);
    const uploaded = await uploadGeneratedImage(
      loaded.article.slug,
      "gmb-cover",
      result.bytes,
      result.mimeType,
    );
    if ("error" in uploaded) return { ok: false, error: uploaded.error };

    const admin = createAdminClient();
    const { error } = await admin
      .from("articles")
      .update({ gmb_cover_url: uploaded.url })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/dashboard/blog/${id}`);
    return { ok: true, data: { url: uploaded.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Gemini inconnue.";
    return { ok: false, error: msg };
  }
}

/**
 * Generate a full article draft from a brief. Returns the generated
 * fields so the editor can populate them client-side — does NOT
 * persist anything to the DB yet (the author may want to tweak
 * before saving).
 */
export async function draftArticleFromBrief(
  brief: ArticleBrief,
): Promise<ActionResult<GeneratedArticle>> {
  const gate = await requireBlogAdmin();
  if ("error" in gate) return { ok: false, error: gate.error };

  if (!brief.topic || brief.topic.trim().length < 5) {
    return { ok: false, error: "Décris ton sujet en quelques mots au minimum." };
  }

  try {
    const draft = await generateArticleDraft(brief);
    return { ok: true, data: draft };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Claude inconnue.";
    return { ok: false, error: msg };
  }
}
