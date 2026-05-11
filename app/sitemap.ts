import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { getAllArticles } from "@/lib/blog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base = site.url.replace(/\/$/, "");
  const articles = await getAllArticles();
  const blogPosts: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${base}/blog/${a.slug}`,
    lastModified: new Date(a.date),
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  return [
    { url: `${base}`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/bar-a-cocktails`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/barista`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/evenements`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/concept`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/cgv`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    ...blogPosts,
  ];
}
