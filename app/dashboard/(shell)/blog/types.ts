export type ArticleStatus = "draft" | "scheduled" | "published";

export type ArticleRow = {
  id: string;
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
  gmb_post: string | null;
  gmb_cover_url: string | null;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Brouillon",
  scheduled: "Planifié",
  published: "Publié",
};

export const STATUS_TONE: Record<ArticleStatus, string> = {
  draft: "bg-neutral-800 text-neutral-300",
  scheduled: "bg-amber-500/15 text-amber-300",
  published: "bg-emerald-500/15 text-emerald-300",
};

/**
 * Turn a free-form title into a URL-friendly slug. The author can
 * override it manually but this gives a sane default while typing.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
