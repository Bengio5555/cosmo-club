import { getAllArticles } from "@/lib/blog";
import { buildLlmsTxt } from "@/lib/content/llms";
import { site } from "@/lib/site";
import { reviewsAggregate } from "@/lib/testimonials";

// Régénéré au plus toutes les heures : un article publié apparaît dans
// /llms.txt sans redéploiement (même cadence que le reste du contenu ISR).
export const revalidate = 3600;

export async function GET() {
  const articles = await getAllArticles();
  const body = buildLlmsTxt({ siteUrl: site.url, articles, reviews: reviewsAggregate });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
