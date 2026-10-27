// Tests des fonctions pures de la stratégie SEO/GEO (avis, llms.txt,
// citations IA, robots IA, attribution). Lancer : npm test
// Node retire les types des .ts importés (type stripping, Node >= 23).
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeGoogleReviewUrl } from "../lib/reviewUrl.ts";
import { buildLlmsTxt } from "../lib/content/llms.ts";
import { collect, isCited, competitorsOf } from "../lib/geo/aiMentions.ts";
import { aiBotName } from "../lib/geo/aiBots.ts";
import { buildReviewEmail, formatEventDateLong } from "../app/dashboard/(shell)/avis/email.ts";

test("lien d'avis : seuls les liens Google en https passent", () => {
  assert.equal(normalizeGoogleReviewUrl("https://g.page/r/abc123/review"), "https://g.page/r/abc123/review");
  assert.ok(normalizeGoogleReviewUrl("  https://search.google.com/local/writereview?placeid=X  "));
  assert.equal(normalizeGoogleReviewUrl("http://g.page/r/abc/review"), null);
  assert.equal(normalizeGoogleReviewUrl("https://g.page.evil.com/review"), null);
  assert.equal(normalizeGoogleReviewUrl("https://evil.com/?u=https://g.page"), null);
  assert.equal(normalizeGoogleReviewUrl("https://user:pw@g.page/r/x"), null);
  assert.equal(normalizeGoogleReviewUrl("javascript:alert(1)"), null);
  assert.equal(normalizeGoogleReviewUrl(""), null);
  assert.equal(normalizeGoogleReviewUrl(null), null);
});

test("e-mail d'avis : prénom, date longue, HTML échappé", () => {
  const { subject, text, html } = buildReviewEmail({
    firstName: "<b>Léa</b>",
    eventDate: "2026-10-18",
    reviewUrl: "https://g.page/r/abc/review?a=1&b=2",
  });
  assert.match(subject, /Google/);
  assert.match(text, /Bonjour <b>Léa<\/b>,/);
  assert.match(text, /18 octobre 2026/);
  assert.ok(!html.includes("<b>Léa</b>"));
  assert.ok(html.includes("&lt;b&gt;Léa&lt;/b&gt;"));
  assert.ok(html.includes('href="https://g.page/r/abc/review?a=1&amp;b=2"'));
  assert.match(buildReviewEmail({ firstName: null, eventDate: "2026-10-18", reviewUrl: "https://g.page/x" }).text, /^Bonjour,/);
  assert.equal(formatEventDateLong("pas une date"), "");
});

test("llms.txt : articles de la base, note Google, presse", () => {
  const out = buildLlmsTxt({
    siteUrl: "https://www.cosmoclub.fr/",
    articles: [{ slug: "guide-mariage", title: "Guide [mariage]" }],
    reviews: { ratingValue: 5, reviewCount: 17, source: "Google" },
  });
  assert.ok(out.startsWith("# Cosmo Club Paris"));
  assert.ok(out.includes("- [Guide mariage](https://www.cosmoclub.fr/blog/guide-mariage)"));
  assert.ok(out.includes("5,0/5 sur 17 avis Google"));
  assert.ok(out.includes("## Ils parlent de nous"));
  assert.ok(out.includes("wedvibes.media"));
  assert.ok(out.includes("## Faits citables"));
  assert.ok(out.includes("## Informations légales"));
  assert.ok(out.endsWith("\n"));
  const empty = buildLlmsTxt({ siteUrl: "https://www.cosmoclub.fr", articles: [], reviews: { ratingValue: 4.8, reviewCount: 3, source: "Google" } });
  assert.ok(empty.includes("(https://www.cosmoclub.fr/blog)"));
  assert.ok(empty.includes("4,8/5"));
});

test("citations IA : domaines des sources, des citations et du texte", () => {
  const content = [
    { type: "server_tool_use", name: "web_search" },
    {
      type: "web_search_tool_result",
      content: [
        { type: "web_search_result", url: "https://www.mariages.net/bar" },
        { type: "web_search_result", url: "https://www.instagram.com/x" },
      ],
    },
    { type: "web_search_tool_result", content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" } },
    {
      type: "text",
      text: "Je vous conseille Le Bar Volant (barvolant.fr) et Cosmo  Club Paris.",
      citations: [{ type: "web_search_result_location", url: "https://zankyou.fr/p/bars" }],
    },
  ];
  const { domains, text } = collect(content);
  assert.deepEqual(new Set(domains), new Set(["mariages.net", "instagram.com", "zankyou.fr", "barvolant.fr"]));
  assert.ok(isCited(domains, text, "cosmoclub.fr", ["Cosmo Club"]));
  assert.ok(!isCited(domains, "Aucun prestataire.", "cosmoclub.fr", ["Cosmo Club"]));
  assert.ok(isCited(["www.cosmoclub.fr".replace("www.", "")], "", "cosmoclub.fr", []));
  assert.ok(!isCited([], "le cosmos club de jazz", "cosmoclub.fr", ["Cosmo Club"]));
  assert.deepEqual(competitorsOf(domains, "cosmoclub.fr").sort(), ["barvolant.fr", "mariages.net", "zankyou.fr"]);
});

test("robots IA : détection par user-agent", () => {
  assert.equal(aiBotName("Mozilla/5.0 (compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)"), "OAI-SearchBot");
  assert.equal(aiBotName("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2"), "GPTBot");
  assert.equal(aiBotName("Mozilla/5.0 (compatible; PerplexityBot/1.0)"), "PerplexityBot");
  assert.equal(aiBotName("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"), "ClaudeBot");
  assert.equal(aiBotName("Mozilla/5.0 (Macintosh) Safari/605.1.15"), null);
  assert.equal(aiBotName(null), null);
});

test("attribution : les liens ChatGPT (utm_source=chatgpt.com) comptent comme assistant IA", async () => {
  const { deriveChannel } = await import("../lib/attribution.ts");
  assert.equal(deriveChannel({ utm_source: "chatgpt.com" }), "ai_assistant");
  assert.equal(deriveChannel({ utm_source: "perplexity" }), "ai_assistant");
  assert.equal(deriveChannel({ referrer: "https://chatgpt.com/" }), "ai_assistant");
  assert.equal(deriveChannel({ utm_source: "google", utm_medium: "cpc" }), "google_ads");
  assert.equal(deriveChannel({ utm_source: "partenaire-x" }), "referral");
});
