import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Robots policy. Two intents stacked:
 *
 *  1. Default policy (User-Agent: *) — everything crawlable except the
 *     authenticated admin surface and per-document direct download URLs
 *     (`/devis/<id>`, `/factures/<id>`) which leak operational data.
 *
 *  2. Explicit AI crawler policy. Following Google's Feb 2026 GEO
 *     guidance, we name the major AI/LLM bots individually so we have
 *     granular control if we ever want to opt one out (training vs
 *     search-grounding can be different policies). For now we allow
 *     all of them — Cosmo Club is a small SAB and AI-search visibility
 *     is a strict win.
 *
 *     - GPTBot / OAI-SearchBot / ChatGPT-User — OpenAI (training,
 *       Search and on-demand browsing respectively)
 *     - ClaudeBot / anthropic-ai — Anthropic
 *     - PerplexityBot / Perplexity-User — Perplexity
 *     - Google-Extended — Google's signal for Gemini/Bard training
 *       (separate from regular Googlebot which we never block)
 *     - CCBot — Common Crawl (feeds many training datasets)
 *
 *     We disallow the same admin surfaces as the default policy.
 */
export default function robots(): MetadataRoute.Robots {
  const adminDisallow = [
    "/admin",
    "/api",
    "/calendar",
    "/dashboard",
    "/devis/",
    "/factures/",
  ];

  const aiAgents = [
    "GPTBot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "ClaudeBot",
    "anthropic-ai",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
    "CCBot",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: adminDisallow,
      },
      ...aiAgents.map((agent) => ({
        userAgent: agent,
        allow: "/",
        disallow: adminDisallow,
      })),
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
