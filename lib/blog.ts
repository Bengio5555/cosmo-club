import { marked } from "marked";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime?: string;
  cover?: string;
  tags?: string[];
  keywords?: string[];
};

export type Article = ArticleMeta & { html: string };

type Row = {
  slug: string;
  title: string;
  description: string;
  body_md: string;
  cover_url: string | null;
  reading_time: string | null;
  keywords: string[] | null;
  tags: string[] | null;
  publish_at: string;
};

function rowToMeta(row: Omit<Row, "body_md">): ArticleMeta {
  return {
    slug: row.slug,
    title: row.title,
    description: row.description,
    date: row.publish_at,
    readingTime: row.reading_time ?? undefined,
    cover: row.cover_url ?? undefined,
    keywords: row.keywords ?? undefined,
    tags: row.tags ?? undefined,
  };
}

/**
 * Public-only Supabase client — uses the anon key directly without
 * any cookie/header plumbing. Necessary because lib/blog.ts is
 * consumed by `generateStaticParams`, `sitemap.ts` and OG metadata
 * functions that run at build time, where `next/headers` is not
 * available. RLS still filters rows: only status='published' or
 * scheduled+past articles come back, regardless of who's reading.
 */
function publicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

const PUBLIC_FILTER = "status.eq.published,and(status.eq.scheduled,publish_at.lte.now())";

export async function getAllArticles(): Promise<ArticleMeta[]> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,description,cover_url,reading_time,keywords,tags,publish_at")
    .or(PUBLIC_FILTER)
    .order("publish_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToMeta);
}

export async function getArticle(slug: string): Promise<Article | null> {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,description,body_md,cover_url,reading_time,keywords,tags,publish_at")
    .eq("slug", slug)
    .or(PUBLIC_FILTER)
    .maybeSingle();
  if (error || !data) return null;
  const html = await marked.parse(data.body_md);
  return { ...rowToMeta(data), html };
}
