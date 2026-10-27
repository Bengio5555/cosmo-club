/**
 * Robots IA dont on relève les passages (proxy.ts → ai_bot_hits). Pur :
 * partagé par le proxy et les tests.
 *
 * Seuls les vrais user-agents de crawl figurent ici. Google-Extended et
 * Applebot-Extended sont des jetons robots.txt, pas des user-agents :
 * Gemini et Apple Intelligence passent par Googlebot / Applebot.
 * Ordre important : les noms précis (OAI-SearchBot, Perplexity-User)
 * avant les génériques. À garder aligné avec le matcher de proxy.ts.
 */
export const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-User",
  "Claude-SearchBot",
  "ClaudeBot",
  "Perplexity-User",
  "PerplexityBot",
  "CCBot",
  "Bytespider",
  "meta-externalagent",
  "MistralAI-User",
] as const;

export function aiBotName(userAgent: string | null): string | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  return AI_BOTS.find((b) => ua.includes(b.toLowerCase())) ?? null;
}
