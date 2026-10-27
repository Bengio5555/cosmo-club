/**
 * Citations dans les réponses IA : on pose une vraie question de client à
 * Claude avec recherche web et on regarde qui est cité. Échantillon, pas
 * un score : « cité dans 3 réponses sur 24 ». Porté du module
 * packages/visibility du SEO Agent.
 *
 * Les fonctions d'analyse sont pures (testées dans aiMentions.test.ts) ;
 * askOne() fait l'appel API. Le texte des réponses vient du web : il est
 * stocké et affiché comme une donnée, jamais interprété.
 */
import type Anthropic from "@anthropic-ai/sdk";

export const GEO_MODEL = "claude-opus-5-5";
/** Opus 5.5 : 4 $ / 20 $ par million de tokens ; recherche web : 10 $ pour 1 000. */
const PRICE_IN = 4 / 1e6;
const PRICE_OUT = 20 / 1e6;
const PRICE_SEARCH = 0.01;

/** Plateformes et réseaux qui ne sont jamais des concurrents : ignorés dans « cités à notre place ». */
export const GENERIC_DOMAINS = [
  "instagram.com", "facebook.com", "linkedin.com", "youtube.com", "tiktok.com", "pinterest.com",
  "x.com", "twitter.com", "wikipedia.org", "google.com", "google.fr", "apple.com", "microsoft.com",
  "amazon.com", "amazon.fr", "medium.com", "reddit.com", "quora.com", "anthropic.com", "claude.ai",
];

export const isGenericDomain = (d: string) =>
  GENERIC_DOMAINS.some((g) => d === g || d.endsWith("." + g));

export function hostOf(u: string): string | null {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export type CitedSource = { url: string; title: string };

/** Domaines des sources (résultats de recherche, citations, adresses écrites dans le texte), pages sources et texte de la réponse. */
export function collect(content: unknown[]): { domains: string[]; sources: CitedSource[]; text: string } {
  const domains = new Set<string>();
  const sources = new Map<string, CitedSource>();
  const addSource = (url: string | undefined, title: string | undefined) => {
    if (!url || sources.has(url) || !/^https?:\/\//.test(url)) return;
    sources.set(url, { url: url.slice(0, 500), title: (title ?? "").replace(/\s+/g, " ").trim().slice(0, 200) });
  };
  let text = "";
  for (const b of content) {
    const x = b as {
      type?: string;
      text?: string;
      content?: unknown;
      citations?: { url?: string; title?: string }[] | null;
    };
    if (!x || typeof x !== "object") continue;
    if (x.type === "web_search_tool_result" && Array.isArray(x.content)) {
      for (const r of x.content as { type?: string; url?: string; title?: string }[]) {
        const h = r?.type === "web_search_result" && r.url ? hostOf(r.url) : null;
        if (h) {
          domains.add(h);
          addSource(r.url, r.title);
        }
      }
    }
    if (x.type === "text" && typeof x.text === "string") {
      text += x.text + "\n";
      for (const c of x.citations ?? []) {
        const h = c?.url ? hostOf(c.url) : null;
        if (h) {
          domains.add(h);
          addSource(c.url, c.title);
        }
      }
    }
  }
  for (const m of text.matchAll(/\b([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})\b/gi)) {
    const h = m[1].replace(/^www\./, "").toLowerCase();
    if (/\.(png|jpe?g|webp|js|css|html?)$/.test(h)) continue;
    if (!/\.(fr|com|net|org|io|paris|co|eu|events?|media|be|ch)$/.test(h)) continue;
    domains.add(h);
  }
  return { domains: [...domains], sources: [...sources.values()], text };
}

const normUrl = (u: string) => u.toLowerCase().replace(/^https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");

/** Page d'une de nos fiches d'annuaire (mariages.net…) : compte comme notre site. */
export function isOwnProfile(url: string, profileUrls: readonly string[]): boolean {
  const u = normUrl(url);
  return profileUrls.some((p) => {
    const n = normUrl(p);
    return u === n || u.startsWith(n + "/");
  });
}

/** Notre site ou une de nos fiches est cité (dans les sources), ou la marque est nommée dans la réponse. */
export function isCited(
  domains: string[],
  text: string,
  ownDomain: string,
  brandTerms: string[],
  sources: CitedSource[] = [],
  profileUrls: readonly string[] = [],
): boolean {
  if (domains.some((d) => d === ownDomain || d.endsWith("." + ownDomain))) return true;
  if (sources.some((s) => isOwnProfile(s.url, profileUrls))) return true;
  if (profileUrls.some((p) => text.toLowerCase().includes(normUrl(p)))) return true;
  const flat = text.toLowerCase().replace(/\s+/g, " ");
  return brandTerms.some((b) => {
    const parts = b.toLowerCase().split(/\s+/).filter(Boolean).map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return parts.length > 0 && new RegExp(`\\b${parts.join("\\s*")}\\b`, "i").test(flat);
  });
}

const isOwn = (d: string, ownDomain: string) => d === ownDomain || d.endsWith("." + ownDomain);

export function competitorsOf(domains: string[], ownDomain: string): string[] {
  return domains.filter((d) => !isOwn(d, ownDomain) && !isGenericDomain(d)).slice(0, 12);
}

/** Pages citées à notre place (ni notre site, ni nos fiches, ni un réseau social), pour savoir à quel article écrire. */
export function competitorSourcesOf(sources: CitedSource[], ownDomain: string, profileUrls: readonly string[] = []): CitedSource[] {
  return sources
    .filter((s) => {
      const h = hostOf(s.url);
      return !!h && !isOwn(h, ownDomain) && !isGenericDomain(h) && !isOwnProfile(s.url, profileUrls);
    })
    .slice(0, 12);
}

export type AskResult = {
  cited: boolean;
  citedDomains: string[];
  citedSources: CitedSource[];
  excerpt: string;
  costUsd: number;
  error: string | null;
};

const SYSTEM =
  "Tu réponds comme un assistant grand public à un utilisateur francophone. Fais une recherche web et cite les prestataires que tu recommandes, avec l'adresse de leur site.";

/**
 * Pose une question. Gère pause_turn (la boucle de recherche côté serveur
 * peut rendre la main avant la fin) et le refus, qui devient une erreur
 * enregistrée pour cette question sans faire échouer le passage.
 */
export async function askOne(
  client: Anthropic,
  question: string,
  opts: { ownDomain: string; brandTerms: string[]; profileUrls?: readonly string[] },
): Promise<AskResult> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];
  const content: unknown[] = [];
  let cost = 0;
  try {
    for (let turn = 0; turn < 3; turn++) {
      const resp = await client.messages.create({
        model: GEO_MODEL,
        max_tokens: 4000,
        output_config: { effort: "low" },
        system: SYSTEM,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
        messages,
      });
      const u = resp.usage;
      cost +=
        (u.input_tokens + (u.cache_creation_input_tokens ?? 0)) * PRICE_IN +
        (u.cache_read_input_tokens ?? 0) * PRICE_IN * 0.1 +
        u.output_tokens * PRICE_OUT +
        (u.server_tool_use?.web_search_requests ?? 0) * PRICE_SEARCH;
      content.push(...resp.content);
      if (resp.stop_reason === "refusal") {
        return { cited: false, citedDomains: [], citedSources: [], excerpt: "", costUsd: cost, error: "Réponse refusée par le modèle" };
      }
      if (resp.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: resp.content });
    }
  } catch (e) {
    return {
      cited: false,
      citedDomains: [],
      citedSources: [],
      excerpt: "",
      costUsd: cost,
      error: (e as Error).message.slice(0, 160),
    };
  }
  const { domains, sources, text } = collect(content);
  const profileUrls = opts.profileUrls ?? [];
  // Un annuaire n'apparaît « à notre place » que s'il est cité par une autre page que notre fiche.
  const viaOtherPages = new Set(
    sources.filter((s) => !isOwnProfile(s.url, profileUrls)).map((s) => hostOf(s.url)),
  );
  const onlyOurProfile = new Set(
    sources.filter((s) => isOwnProfile(s.url, profileUrls)).map((s) => hostOf(s.url)).filter((h) => h && !viaOtherPages.has(h)),
  );
  return {
    cited: isCited(domains, text, opts.ownDomain, opts.brandTerms, sources, profileUrls),
    citedDomains: competitorsOf(domains.filter((d) => !onlyOurProfile.has(d)), opts.ownDomain),
    citedSources: competitorSourcesOf(sources, opts.ownDomain, profileUrls),
    excerpt: text.replace(/\s+/g, " ").trim().slice(0, 400),
    costUsd: cost,
    error: null,
  };
}
