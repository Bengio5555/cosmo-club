// Tests des fonctions pures de la stratégie SEO/GEO (avis, llms.txt,
// citations IA, robots IA, attribution). Lancer : npm test
// Node retire les types des .ts importés (type stripping, Node >= 23).
import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeGoogleReviewUrl } from "../lib/reviewUrl.ts";
import { buildLlmsTxt } from "../lib/content/llms.ts";
import { collect, isCited, competitorsOf, competitorSourcesOf } from "../lib/geo/aiMentions.ts";
import { candidateActions, pickActions, isArticleUrl, isDirectory, outcomeOf, baselineFor } from "../lib/geo/actions.ts";
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
  assert.equal(subject, "Merci pour ce beau moment");
  assert.match(text, /Bonjour <b>Léa<\/b>,/);
  assert.match(text, /accueillis pour votre événement du 18 octobre\./);
  assert.match(text, /quelques mots sur Google nous feraient très plaisir/);
  assert.match(text, /La Cosmo Team$/);
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
  const { sources } = collect(content);
  assert.deepEqual(
    competitorSourcesOf(sources, "cosmoclub.fr").map((x) => x.url).sort(),
    ["https://www.mariages.net/bar", "https://zankyou.fr/p/bars"],
  );
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

// --- « À faire cette semaine » ---------------------------------------------
const run = (id, ran_at) => ({ id, ran_at, questions: 4, cited: 0 });
const res = (run_id, question, category, cited, domains = [], sources = []) => ({
  run_id, question, category, cited, cited_domains: domains, cited_sources: sources, error: null,
});

test("à faire : annuaire, article, catégorie à 0, avis en attente, trois au plus", () => {
  const runs = [run("r2", "2026-10-26T06:00:00Z"), run("r1", "2026-10-19T06:00:00Z")];
  const art = { url: "https://blog-mariage.fr/blog/top-10-bars-a-cocktails-mariage-paris", title: "Top 10 des bars à cocktails" };
  const results = [];
  for (const r of ["r1", "r2"]) {
    results.push(res(r, "Q prix 1", "prix", false, ["mariages.net", "blog-mariage.fr"], [art]));
    results.push(res(r, "Q prix 2", "prix", false, ["mariages.net", "blog-mariage.fr"], [art]));
    results.push(res(r, "Q mariage", "mariage", true, ["blog-mariage.fr"], [art]));
  }
  const all = candidateActions({ runs, results, pendingReviews: { count: 2, latestEventId: "e1" } });
  const keys = all.map((a) => a.key);
  assert.deepEqual(keys.slice(0, 4), ["reviews:e1", "content:prix", "site:mariages.net", "site:blog-mariage.fr"]);
  assert.equal(all.find((a) => a.key === "site:blog-mariage.fr").kind, "article");
  assert.deepEqual(all.find((a) => a.key === "site:blog-mariage.fr").article, art);
  assert.equal(all.find((a) => a.key === "site:mariages.net").kind, "directory");
  assert.ok(!keys.includes("content:mariage"), "une catégorie citée ne déclenche rien");
  assert.match(all.find((a) => a.key === "site:blog-mariage.fr").detail, /4 réponses/, "les réponses où l'on est cité ne comptent pas");

  const today = "2026-10-27";
  assert.equal(pickActions(all, [], today).length, 3);
  const decisions = [
    { key: "reviews:e1", status: "done", done_at: "2026-10-27T10:00:00Z", snoozed_until: null, baseline: null, title: "", kind: "reviews" },
    { key: "content:prix", status: "snoozed", snoozed_until: "2026-11-10", done_at: null, baseline: null, title: "", kind: "content" },
  ];
  assert.deepEqual(pickActions(all, decisions, today).map((a) => a.key), ["site:mariages.net", "site:blog-mariage.fr"]);
  assert.ok(pickActions(all, decisions, "2026-11-10").some((a) => a.key === "content:prix"), "plus tard revient à échéance");
});

test("à faire : seuil de 3 réponses sans nous, et poids plafonné", () => {
  const runs = [run("r1", "2026-10-26T06:00:00Z")];
  const results = [res("r1", "Q1", "prix", false, ["rare.fr"]), res("r1", "Q2", "prix", true, ["rare.fr"])];
  assert.ok(!candidateActions({ runs, results, pendingReviews: { count: 0, latestEventId: null } }).some((a) => a.key === "site:rare.fr"));
  const many = Array.from({ length: 40 }, (_, i) => res("r1", `Q${i}`, "mariage", false, ["mariages.net"]));
  const acts = candidateActions({ runs, results: many, pendingReviews: { count: 1, latestEventId: "e9" } });
  assert.equal(acts[0].key, "reviews:e9", "un site très cité ne passe pas devant les avis en attente");
});

test("à faire : reconnaître annuaires et articles", () => {
  assert.ok(isDirectory("www.mariages.net".replace("www.", "")));
  assert.ok(isDirectory("fr.zankyou.fr".replace("fr.", "")));
  assert.ok(isArticleUrl("https://site.fr/blog/bar-mariage"));
  assert.ok(isArticleUrl("https://site.fr/les-10-meilleurs-bars-a-cocktails-paris"));
  assert.ok(!isArticleUrl("https://concurrent.fr/"));
  assert.ok(!isArticleUrl("https://concurrent.fr/mariage"));
});

test("à faire : mesure à J+28 sur les questions de l'action", () => {
  const before = [run("b1", "2026-09-01T06:00:00Z")];
  const after = [run("a2", "2026-10-20T06:00:00Z"), run("a1", "2026-10-13T06:00:00Z")];
  const results = [
    res("b1", "Q prix", "prix", false), res("b1", "Q prix 2", "prix", false),
    res("a1", "Q prix", "prix", true), res("a1", "Q prix 2", "prix", false),
    res("a2", "Q prix", "prix", true), res("a2", "Q prix 2", "prix", false),
    res("a2", "Autre", "mariage", false),
  ];
  const action = { questions: ["Q prix", "Q prix 2"] };
  const baseline = baselineFor(action, before, results);
  assert.deepEqual(baseline, { questions: ["Q prix", "Q prix 2"], cited: 0, total: 2 });
  const d = { key: "content:prix", status: "done", done_at: "2026-09-02T10:00:00Z", baseline, snoozed_until: null, title: "", kind: "content" };
  const runs = [...after, ...before];
  const o = outcomeOf(d, runs, results, new Date("2026-10-27T00:00:00Z"));
  assert.equal(o.state, "measured");
  assert.deepEqual(o.after, { cited: 2, total: 4 });
  assert.equal(o.better, true);
  assert.equal(outcomeOf(d, runs, results, new Date("2026-09-20T00:00:00Z")).state, "waiting");
});

// --- Fiches d'annuaire (mariages.net) --------------------------------------
test("fiche mariages.net : compte comme une citation, et l'action devient « étoffer »", async () => {
  const { isOwnProfile } = await import("../lib/geo/aiMentions.ts");
  const fiche = "https://www.mariages.net/animation-mariage/cosmo-club--e423149";
  assert.ok(isOwnProfile("https://mariages.net/animation-mariage/cosmo-club--e423149?utm=x", [fiche]));
  assert.ok(!isOwnProfile("https://www.mariages.net/animation-mariage/autre--e1", [fiche]));
  const sources = [{ url: fiche, title: "Cosmo Club" }];
  assert.ok(isCited(["mariages.net"], "Je conseille ce bar.", "cosmoclub.fr", ["Cosmo Club"], sources, [fiche]));
  assert.ok(!isCited(["mariages.net"], "Je conseille ce bar.", "cosmoclub.fr", ["Cosmo Club"], [{ url: "https://www.mariages.net/x", title: "" }], [fiche]));
  assert.deepEqual(competitorSourcesOf([...sources, { url: "https://www.mariages.net/x", title: "" }], "cosmoclub.fr", [fiche]).map((s) => s.url), ["https://www.mariages.net/x"]);

  const runs = [run("r1", "2026-10-26T06:00:00Z")];
  const results = [1, 2, 3].map((i) => res("r1", `Q${i}`, "mariage", false, ["mariages.net"]));
  const acts = candidateActions({ runs, results, pendingReviews: { count: 0, latestEventId: null }, presence: [{ domain: "mariages.net", url: fiche }] });
  const a = acts.find((x) => x.key === "profile:mariages.net");
  assert.ok(a, "action « étoffer la fiche »");
  assert.equal(a.href, fiche);
  assert.ok(!acts.some((x) => x.key === "site:mariages.net"), "plus de « Inscris Cosmo Club »");
});

test("llms.txt : les fiches d'annuaire apparaissent dans Identité", () => {
  const out = buildLlmsTxt({
    siteUrl: "https://www.cosmoclub.fr",
    articles: [],
    reviews: { ratingValue: 5, reviewCount: 15, source: "Google" },
    profiles: [{ label: "Mariages.net", url: "https://www.mariages.net/animation-mariage/cosmo-club--e423149" }],
  });
  assert.match(out, /- Instagram : @cosmoclubparis\n- Mariages\.net : https:\/\/www\.mariages\.net\/animation-mariage\/cosmo-club--e423149/);
});
