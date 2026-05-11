import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

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

async function readArticleFile(slug: string) {
  const raw = await readFile(path.join(BLOG_DIR, `${slug}.md`), "utf-8");
  return matter(raw);
}

export async function getAllArticles(): Promise<ArticleMeta[]> {
  let files: string[];
  try {
    files = await readdir(BLOG_DIR);
  } catch {
    return [];
  }
  const articles = await Promise.all(
    files
      .filter((f) => f.endsWith(".md"))
      .map(async (f) => {
        const slug = f.replace(/\.md$/, "");
        const { data } = await readArticleFile(slug);
        return { slug, ...(data as Omit<ArticleMeta, "slug">) };
      }),
  );
  return articles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getArticle(slug: string): Promise<Article | null> {
  try {
    const { data, content } = await readArticleFile(slug);
    const html = await marked.parse(content);
    return {
      slug,
      ...(data as Omit<ArticleMeta, "slug">),
      html,
    };
  } catch {
    return null;
  }
}
