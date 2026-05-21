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
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-transparent",
  scheduled:
    "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-transparent",
  published:
    "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-transparent",
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
