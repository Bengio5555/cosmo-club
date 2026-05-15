import { marked } from "marked";
import { createClient } from "@/lib/supabase/server";

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

function rowToMeta(row: Pick<Row, "slug" | "title" | "description" | "cover_url" | "reading_time" | "keywords" | "tags" | "publish_at">): ArticleMeta {
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

// The DB stores articles with three statuses: draft (invisible), scheduled
// (visible from publish_at), published (always visible). We use the same
// filter on every public read: status='published' OR (scheduled AND past).
// RLS enforces this on the DB side too — the filter here just keeps the
// query plan tight.
const PUBLIC_FILTER = "status.eq.published,and(status.eq.scheduled,publish_at.lte.now())";

export async function getAllArticles(): Promise<ArticleMeta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,description,cover_url,reading_time,keywords,tags,publish_at,status")
    .or(PUBLIC_FILTER)
    .order("publish_at", { ascending: false });
  if (error || !data) return [];
  return data.map(rowToMeta);
}

export async function getArticle(slug: string): Promise<Article | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,description,body_md,cover_url,reading_time,keywords,tags,publish_at,status")
    .eq("slug", slug)
    .or(PUBLIC_FILTER)
    .maybeSingle();
  if (error || !data) return null;
  const html = await marked.parse(data.body_md);
  return { ...rowToMeta(data), html };
}
