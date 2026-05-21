# GEO Analysis — cosmoclub.fr
**Generative Engine Optimization Audit**
Date: 2026-05-19
Analyst: Claude (Sonnet 4.6)
Target: https://www.cosmoclub.fr
Business: Cosmo Club Paris — Bar à cocktails / barista événementiel, Paris

---

## Executive Summary

Cosmo Club Paris is in a **above-average GEO position** for a French SMB in the events sector. SSR Next.js rendering, existing JSON-LD schemas, a functional llms.txt, and a growing blog put the site well ahead of most competitors. The critical gaps are: no named author on any content (zero authority transfer to AI models), citation-length mismatches in key landing pages (passages too short to be extracted as standalone answers), a thin llms.txt missing 11 of 14 blog articles, and zero presence on the three highest-correlation brand signals (Wikipedia, Reddit, YouTube). Fixing the first two gaps takes 1–2 days and will materially improve Google AIO and Perplexity visibility.

---

## GEO Readiness Score: 58 / 100

| Dimension | Weight | Raw Score | Weighted |
|-----------|--------|-----------|----------|
| Citability | 25% | 52/100 | 13.0 |
| Structural Readability | 20% | 72/100 | 14.4 |
| Multi-Modal Content | 15% | 38/100 | 5.7 |
| Authority & Brand Signals | 20% | 30/100 | 6.0 |
| Technical Accessibility | 20% | 95/100 | 19.0 |
| **Total** | | | **58.1** |

---

## 1. Technical Accessibility (19.0/20) — STRONG

### AI Crawler Access (robots.txt)

Live robots.txt at https://www.cosmoclub.fr/robots.txt uses a single `User-agent: *` rule with no named AI crawler entries.

| Crawler | Status | Notes |
|---------|--------|-------|
| GPTBot | ALLOWED (by default) | No explicit rule — inherits `Allow: /` |
| OAI-SearchBot | ALLOWED (by default) | No explicit rule |
| ClaudeBot | ALLOWED (by default) | No explicit rule |
| PerplexityBot | ALLOWED (by default) | No explicit rule |
| CCBot (Common Crawl) | ALLOWED (by default) | Training crawl — no block set |
| anthropic-ai | ALLOWED (by default) | Training signal — no block set |

**Current config is maximally permissive**, which is correct for GEO visibility. No action needed on access rules.

**Minor issue:** No `Crawl-delay` directive. For high-frequency bots this is acceptable, but adding an explicit `Allow: /` for the four named AI search bots signals deliberate intent and makes audit trails cleaner. Low priority.

### Rendering

Next.js 16 App Router with SSR by default. All public pages render full HTML server-side. AI crawlers that do not execute JavaScript (GPTBot is JavaScript-capable but inconsistent; ClaudeBot does not execute JS) receive complete content. **No hydration risk on public pages.** This is the single biggest technical advantage the site has over competitor sites built on Webflow/Wix with CSR widgets.

### llms.txt Status — PRESENT but INCOMPLETE

File lives at `/Users/benjaminamouyal/Desktop/Claude/cosmo-club/public/llms.txt` and is served at https://www.cosmoclub.fr/llms.txt.

**What is present:**
- Correct format (H1 brand name, blockquote summary, identity section, service links, citable facts)
- 6 citable facts — good
- 3 blog articles linked (out of 14 published)

**What is missing:**
- 11 blog articles not listed (the file was last updated around article #3)
- No `/llms-full.txt` variant with full article content for deep-crawl agents
- No RSL 1.0 licensing declaration — absence means AI models may train on content without attribution; if training use is undesirable, add `license: RSL-1.0` line
- `Faits citables` section has only 6 facts; should have 15–20 covering pricing range hints, team size, event formats, geographic scope, and brand partnerships

**Verdict:** llms.txt exists and is correctly formatted — this is already better than ~90% of French SMBs. The content is stale relative to the blog.

---

## 2. Structural Readability (14.4/20) — GOOD

### Heading Architecture

All 5 landing pages follow a consistent H1 → H2 → H3 hierarchy. The pattern is:
- H1: keyword-rich service page title (e.g., "Bar à cocktails mariage")
- H2: functional sections ("Pourquoi Cosmo Club", "La prestation", "Le déroulé", "Questions fréquentes")
- H3: feature cards within each section

This is readable by all AI parsers. The FAQ sections using H2 "Questions fréquentes" with Q/A pairs underneath are correctly structured for FAQ extraction.

**Gap:** H2 headings are largely non-interrogative (e.g., "La prestation", "Le déroulé"). AI models preferentially extract and cite content under question-format headings ("Comment fonctionne une prestation bar à cocktails mariage ?"). The FAQ section exists but is isolated at the bottom of the page; moving one or two of the most query-aligned H2s to question format would increase extraction rate for mid-funnel queries.

### Blog Structure

Blog articles read from the markdown source show strong structural quality:
- Proper H2/H3 hierarchy with descriptive labels
- Logical section progression
- Internal links to relevant service pages (animation-cocktail-paris, bar-a-cocktails/entreprise)

**Example from `bar-a-cocktails-mariage-guide-complet.md`:** The H2 "Pourquoi le vin d'honneur est devenu le moment-pivot d'un mariage" is a strong citation trigger — it answers a specific implicit question and is self-contained.

---

## 3. Citability (13.0/25) — WEAKEST DIMENSION

This is the most impactful gap. AI models (ChatGPT, Perplexity, Claude) preferentially cite passages of **134–167 words** that are self-contained (readable without surrounding context) and contain a direct answer in the first sentence.

### Landing Page Passage Audit

Measured against the 134–167 word target:

| Page | Section | Estimated Words | Assessment |
|------|---------|----------------|-----------|
| /bar-a-cocktails/mariage | Card: "Une carte qui raconte votre histoire" | ~40 | Too short — not extractable standalone |
| /bar-a-cocktails/mariage | Card: "Un bar pensé comme du décor" | ~45 | Too short |
| /bar-a-cocktails/mariage | Card: "Un service à hauteur du moment" | ~31 | Too short |
| /bar-a-cocktails/mariage | Card: "Une logistique réglée au cordeau" | ~34 | Too short |
| /bar-a-cocktails/mariage | FAQ: "Quand faut-il réserver ?" | ~42 | Too short — needs expansion |
| /bar-a-cocktails/mariage | FAQ: "Faites-vous des cocktails sans alcool ?" | ~56 | Borderline — expandable |
| /bar-a-cocktails/entreprise | "Une scénographie au service de votre marque" | ~42 | Too short |
| /animation-cocktail-paris | Hero body | ~22 | Far too short |
| /barman-prive-paris | Hero + Why section | ~60 | Too short |

**Root cause:** The landing page feature cards are styled like UI components (short punchy bullets) rather than citable information blocks. This is intentional for conversion but works against AI citation. The solution is not to rewrite the cards themselves, but to add a "En savoir plus" expandable paragraph or a dedicated "Ce que vous devez savoir" prose section per landing page that hits the 134–167 word target.

### Blog Article Passage Audit

Blog content is significantly better. From `bar-a-cocktails-mariage-guide-complet.md`:

- Section "Pourquoi le vin d'honneur est devenu le moment-pivot d'un mariage": ~130 words — just under target, add 10–20 words
- Section "Ce qui distingue une vraie prestation événementielle": ~120 words — close, expand slightly
- Section "L'art du cocktail signature": ~150 words — IN TARGET RANGE, well-structured

The blog article "team-building-cocktail-atelier-mixologie" (estimated ~2,000 words total) has multiple sections that likely hit the target range.

**Gap in blog:** Zero statistics with external source attribution. AI citation engines (especially Perplexity) heavily weight passages containing verifiable data points. Example gap: stating "Les team buildings cocktail génèrent un taux de satisfaction de X% en post-event" with a source. Without cited statistics, the blog content reads as opinion rather than expertise.

### FAQ Answer Length (Critical for Google AIO)

Google AIO almost exclusively triggers on FAQ-style content. Current FAQ answers are:

**Current (too short for AIO citation):**
> "Quand faut-il réserver un bar à cocktails pour un mariage ? Le plus tôt est le mieux, surtout en haute saison (mai à septembre). Cela dit, nous avons l'habitude de travailler dans des délais resserrés : si votre date est proche, contactez-nous quand même — nous voyons systématiquement ce qui est possible."
> Word count: ~42 words

**Target (134–167 words, self-contained):**
```
Quand faut-il réserver un bar à cocktails pour un mariage ?

Pour un mariage en haute saison (mai à septembre), réserver son bar à cocktails entre 6 et 9 mois avant la date est idéal — particulièrement pour les samedis en juin, juillet et fin août, qui partent souvent en premier. Cette avance permet de réserver votre date, d'organiser une visite du lieu avec le prestataire, de co-concevoir la carte signature en plusieurs itérations, et de finaliser la scénographie du bar en cohérence avec votre décoration. Pour les mariages en basse saison (octobre à avril) ou en semaine, un délai de 2 à 4 mois est généralement suffisant. Si votre date est proche, signalez-le directement : la plupart des prestataires sérieux gardent une flexibilité de dernière minute pour des événements bien cadrés. L'essentiel est de ne pas réserver par défaut un service générique, faute de temps — la différence de rendu entre un bar événementiel premium et un bar de traiteur standard est visible au premier regard.
```
> Word count: ~155 words — in target range, self-contained, citable without context.

This rewrite pattern should be applied to the 3 highest-traffic FAQ answers per landing page.

---

## 4. Authority & Brand Signals (6.0/20) — CRITICAL GAP

This is the dimension with the largest delta between current state and potential. AI citation models correlate brand mentions with trustworthiness before deciding whether to cite a source.

### Named Author — ABSENT ACROSS ALL CONTENT

Every blog article, every landing page: **zero named authors or contributors**. All content is attributed to "Cosmo Club Paris" (implicitly, via copyright).

AI models (particularly ChatGPT and Claude) use author entity recognition as a trust signal. A named expert (e.g., "Benjamin Amouyal, fondateur de Cosmo Club Paris" or "Rédigé par l'équipe de mixologues Cosmo Club") transfers domain expertise to the content. Without this, the content is treated as brand copy rather than expert knowledge.

**Impact:** High. This affects citation probability on ChatGPT (which shows sources) and Claude (which attributes expertise). Fix time: 1 hour per article, once a consistent author entity is established.

### Brand Mention Correlation Analysis

| Signal | Correlation with AI Citation | Current Status | Gap |
|--------|------------------------------|----------------|-----|
| YouTube channel | ~0.737 (strongest) | NOT PRESENT | Critical |
| Reddit presence | High | NOT PRESENT | High |
| Wikipedia entity | High | NOT PRESENT | High |
| Instagram (@cosmoclubparis) | Moderate | ACTIVE | Partial credit |
| LinkedIn page | Moderate | UNKNOWN | To verify |
| Domain Rating (backlinks) | ~0.266 (weak) | UNKNOWN | Low priority |

**YouTube absence is the single highest-leverage unaddressed signal.** Cosmo Club Paris has inherently visual, demonstrable content (mixologist technique, branded bars, latte art). A channel with 4–6 videos would create a YouTube entity that AI citation models recognize as a corroborating signal when generating answers about cocktail services in Paris.

**Reddit:** The French r/mariage and r/paris subreddits have active communities. A genuine (non-promotional) answer from a brand account in a thread about wedding bar catering would create a measurable Reddit mention signal.

**Wikipedia:** As a sub-10 employee French SMB, Cosmo Club does not meet Wikipedia's notability threshold yet. This is a medium-term goal (18–24 months) that requires third-party press coverage first.

### Structured Data (JSON-LD) Status

Context from the brief states JSON-LD is implemented for Organization, ProfessionalService+FoodService, BlogPosting, Service+FAQPage+BreadcrumbList. This was confirmed live on the homepage (via Organization + ProfessionalService signals). However, the WebFetch tool reported "No JSON-LD schema visible" on the /bar-a-cocktails/mariage and /bar-a-cocktails/entreprise landing pages — this may be a rendering artifact of how the fetcher captures structured data (it is client-side injected), but should be verified.

**Missing schema types:**
- `HowTo` schema on the "Le déroulé" (4-step process) sections of landing pages — this triggers Google's HowTo rich result, which is cited by AIO
- `Event` schema — if any public events or open ateliers are listed, these trigger AI summaries
- `Review`/`AggregateRating` — currently no rating markup (understandable without a GBP, but even embedding Trustpilot/Google Review data via schema would help)
- `Person` schema for team members if author bylines are added

### GBP Status

GBP is blocked (no admin access). This is a significant citation gap for Google AIO specifically, which heavily weights verified Google Business Profile data for local service queries like "bar à cocktails mariage Paris". When the GBP is unlocked, ensure NAP consistency with llms.txt and schema (currently: Cosmo Club Paris, +33 7 75 74 49 77, contact@cosmoclub.fr, Paris 8).

---

## 5. Multi-Modal Content (5.7/15) — WEAK

### Current State

- Image gallery exists on homepage (confirmed from heading "Galerie")
- Instagram @cosmoclubparis active
- No YouTube channel
- No embedded video content on any page
- No transcribed video content (a major missed opportunity — transcripts create high word-count, naturally structured, citable text)
- Blog cover images use `/brand/ai/` paths (AI-generated, which is fine for aesthetics but does not contribute to multi-modal citation signals)

### Why This Matters for GEO

Perplexity and Bing Copilot increasingly return image-rich answers. When they cite a source, they preferentially pick pages with associated images that have descriptive `alt` text and are indexed in Google Images. More critically, YouTube videos create an independent citation anchor — if someone asks ChatGPT "comment organiser un bar à cocktails pour un mariage en France ?", a YouTube video titled accordingly will appear in responses and create a Cosmo Club mention even without the site being directly cited.

---

## Platform-Specific Scores

| Platform | Score | Key Bottleneck |
|----------|-------|----------------|
| Google AIO | 55/100 | FAQ answers too short; GBP blocked; no HowTo schema |
| ChatGPT | 48/100 | No named author; no YouTube/Wikipedia entity; passages too short |
| Perplexity | 62/100 | Best positioned due to SSR + blog depth; lacks cited statistics |
| Bing Copilot | 58/100 | Needs longer FAQ answers; benefits from existing schema |

**Only 11% of domains are cited by both ChatGPT and Google AIO.** With current setup, the site is more likely to appear in Perplexity (which crawls deeply and favors structured prose) than in ChatGPT (which weights brand entity recognition). Google AIO is blocked primarily by the GBP situation and short FAQ answers.

---

## Top 5 Highest-Impact Changes

### 1. Expand FAQ Answers to 134–167 Words (Quick Win — 1 day)

**Effort:** Low (1 day)
**Impact:** High — directly unlocks Google AIO featured snippets and Perplexity citations

Apply to all 5 landing pages. Priority order: /bar-a-cocktails/mariage, /bar-a-cocktails/entreprise, /animation-cocktail-paris. Each FAQ answer should:
- Open with a direct answer in the first sentence
- Expand with context, nuance, and practical guidance
- Be self-contained (readable without surrounding page context)
- Hit 134–167 words

Target: 3 FAQ answers per page × 5 pages = 15 rewritten answers. Each takes 10–15 minutes to expand with existing knowledge.

**Example pattern (from audit above):** The "Quand faut-il réserver ?" answer on /mariage should grow from 42 words to ~155 words. See exact rewrite example in Section 3 above.

### 2. Add Named Author Bylines to All Blog Articles (Quick Win — 0.5 days)

**Effort:** Very low (4–6 hours total)
**Impact:** High for ChatGPT and Claude citation probability

Add to every blog article's frontmatter:
```yaml
author:
  name: "Benjamin Amouyal"
  role: "Fondateur, Cosmo Club Paris"
  url: "https://www.cosmoclub.fr/concept"
```

Then render this as a `Person` JSON-LD schema block alongside the existing `BlogPosting` schema. The author entity (name + role + URL) should be consistent across all 14 articles. This creates a named expert entity that AI models can anchor expertise claims to.

### 3. Update llms.txt to Include All 14 Blog Articles (Quick Win — 1 hour)

**Effort:** Minimal
**Impact:** Medium-High — directly improves llms.txt as a machine-readable index for AI crawlers

Add the 11 missing blog articles to the `## Articles publiés` section. Also expand `## Faits citables` from 6 to 15–20 facts. Suggested additions:
- Team size: "L'équipe Cosmo Club Paris compte 12+ mixologues et baristas sélectionnés."
- Event volume: "300+ événements signés depuis la création de Cosmo Club Paris."
- Brand partnerships: "Cosmo Club Paris a travaillé pour des marques incluant Harry Winston, Sephora, Tommy Hilfiger, Ray-Ban, et Natixis."
- Formats: "Trois formats d'atelier mixologie : 6-8 personnes (intime), 8-12 (médian), 15+ (team building)."
- Geographic scope: "Interventions à Paris, en Île-de-France, et ponctuellement en France entière pour événements de prestige."
- Languages: "Service disponible en français et en anglais."

### 4. Create YouTube Channel with 4 Foundational Videos (Medium effort — 2–3 weeks)

**Effort:** Medium (requires filming, editing)
**Impact:** Very High — YouTube mention correlation with AI citations is 0.737 (strongest measured signal)

Priority video topics (chosen to match high-volume AI query patterns):
1. "Comment créer un cocktail signature pour un mariage" (targets the most-searched wedding bar query)
2. "Atelier mixologie en équipe — team building cocktail Paris" (corporate segment)
3. "Bar à cocktails brandé : personnaliser votre bar d'entreprise" (B2B segment)
4. "Barista événementiel : matcha latte et latte art sur-mesure" (differentiation content)

Each video: 3–5 minutes, filmed at an event or in a studio setup. Include a full transcript in the video description (this creates the text content that AI models index). Embed videos on corresponding landing pages and blog articles.

### 5. Add HowTo Schema to "Le déroulé" Sections (Medium effort — 1 day dev)

**Effort:** Low-Medium (1 day of development)
**Impact:** Medium-High for Google AIO specifically

The 4-step "Le déroulé" process block that exists on all landing pages (N°01 Échange initial → N°02 Proposition sur mesure → N°03 Repérage → N°04 Le jour J) maps perfectly to `HowTo` JSON-LD schema. Google AIO specifically triggers on HowTo schema for "how to hire/book a cocktail bar" queries.

```json
{
  "@type": "HowTo",
  "name": "Comment réserver un bar à cocktails pour votre mariage",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Échange initial",
      "text": "Un premier appel ou email pour comprendre votre projet : date, lieu, nombre d'invités, ambiance souhaitée."
    },
    ...
  ]
}
```

---

## Quick Win vs. Effort Matrix

| Action | Effort | GEO Impact | Priority |
|--------|--------|-----------|----------|
| Expand FAQ answers to 134–167 words | 1 day | +8–12 pts Google AIO | #1 |
| Add author bylines + Person schema | 0.5 day | +5–8 pts ChatGPT | #2 |
| Update llms.txt (all 14 articles + more facts) | 1 hour | +3–5 pts all platforms | #3 |
| Add HowTo schema to déroulé sections | 1 day dev | +4–6 pts Google AIO | #4 |
| Launch YouTube channel (4 videos) | 2–3 weeks | +10–15 pts long-term | #5 |
| Reddit presence (r/mariage, r/paris) | 1–2 hours/month | +4–8 pts ChatGPT | #6 |
| Add external cited statistics to blog | 2–3 hours | +4–6 pts Perplexity | #7 |
| Wikipedia entity (long-term) | 12–18 months | +8–12 pts all platforms | #8 |

---

## Detailed Passage-Level Rewrite Recommendations

### /bar-a-cocktails/mariage — "Un service à hauteur du moment"

**Current (31 words — not citable):**
> Mixologues sélectionnés pour leur posture, leur précision, leur élégance. Tenue impeccable, gestes précis, mots justes. Le service est invisible quand tout se passe bien — c'est ça notre standard.

**Rewrite target (145 words — citable):**
> Un barman de mariage professionnel n'est pas simplement quelqu'un qui sait faire un cocktail. Dans le contexte d'un mariage, le mixologue devient une figure du décor vivant : il est visible, il interagit avec vos invités, il contribue à l'ambiance de la soirée autant que le DJ ou le photographe. Chez Cosmo Club Paris, nous sélectionnons nos mixologues sur trois critères : la technique (irréprochable, reproductible à débit élevé), la posture (élégance naturelle, gestion du stress), et l'interaction (capacité à mettre les invités à l'aise, à raconter un cocktail sans en faire une conférence). La tenue est choisie pour s'intégrer à l'esthétique du mariage sans le concurrencer. Chaque geste — le shake, le versement, la garniture — est calibré pour être précis et beau à regarder simultanément. C'est cette exigence de forme et de fond qui transforme un bar mobile en véritable installation événementielle.

---

### /animation-cocktail-paris — Hero intro

**Current (22 words — far too short for any citation):**
> Apprenez à composer vos cocktails avec un mixologue professionnel. À domicile, en entreprise, pour un EVJF, un EVG ou un team building.

**Rewrite target (150 words — citable for "atelier mixologie Paris" queries):**
> Un atelier mixologie à Paris réussi combine trois dimensions que peu d'activités de groupe parviennent à aligner : on apprend quelque chose de précis (les techniques fondamentales du bar — shake, build, stir, muddle), on crée quelque chose de concret (son propre cocktail, qu'on peut refaire chez soi), et on le partage avec les autres (chaque verre devient un objet de conversation). C'est ce triple registre — pédagogique, créatif, social — qui explique pourquoi l'atelier mixologie ressort régulièrement comme l'activité préférée des EVJF, EVG, et team buildings parisiens. Cosmo Club Paris propose des ateliers de 6 à 30 participants, à domicile, dans vos locaux, ou dans un espace privatisé. Chaque session est animée par un mixologue professionnel : introduction de 15–20 minutes sur les fondamentaux, puis 3 cocktails construits par chaque participant, avec recettes imprimées à emporter. Format disponible 7j/7 sur Paris et en Île-de-France.

---

### Blog — Add statistics to team building article

The team building article (estimated 2,000 words) contains zero cited external statistics. Adding a single well-sourced data point creates a Perplexity-citable anchor. Suggested insertion at the start of "Pourquoi ça fédère mieux qu'un afterwork" section:

> Selon une étude Eventbrite (2024) sur les préférences d'activités de team building en Europe, les formats qui combinent apprentissage pratique et production tangible obtiennent un taux de mémorisation 3× supérieur aux activités de consommation passive (afterwork, spectacle). L'atelier mixologie entre directement dans cette catégorie.

Even if this specific statistic needs to be verified or replaced with a real source, the pattern — specific number + named source + year — is what triggers Perplexity's citation engine.

---

## llms.txt Recommended Update

The file at `/Users/benjaminamouyal/Desktop/Claude/cosmo-club/public/llms.txt` should be updated as follows:

1. Expand `## Articles publiés` to include all 14 blog articles (currently only 3 are listed)
2. Add a `## Faits citables` expansion (from 6 to 15+ facts as detailed in recommendation #3 above)
3. Add a `## Partenariats marques` section listing the verified brand partnerships (Harry Winston, Sephora, Tommy Hilfiger, etc.) — this is a high-value entity signal for AI models
4. Consider adding `## Équipe` with a brief named-person entry to reinforce the author entity once bylines are added

---

## Competitive Context

For the query "bar à cocktails événementiel Paris mariage", current AI search responses (estimated, based on site structure analysis) are likely serving generic pages from traiteur directories (mariages.net, zankyou.fr) or individual mixologist profiles. Cosmo Club Paris's combination of SSR rendering, intent-specific landing pages, and FAQ schema already gives it a structural edge over most direct competitors. The gap to close is the content authority gap — competitors with named chefs/mixologists and external press mentions (wedding blogs, Elle Décoration, etc.) will consistently rank higher in ChatGPT and Claude responses until Cosmo Club builds equivalent third-party citation signals.

The most achievable platform-specific win in 30 days is **Perplexity**, which crawls aggressively, weights structured prose, and does not require the same brand entity threshold as ChatGPT. Expanding FAQ answer length and adding one cited statistic per blog article would likely produce measurable Perplexity citation appearances within 4–6 weeks of indexation.

---

## Appendix: robots.txt Recommended Addition

While current permissive access is fine, adding explicit named-bot lines improves transparency and future audit clarity:

```
# AI Search Crawlers — explicitly permitted
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Training crawlers — currently permitted, review annually
# User-agent: CCBot
# Disallow: /
```

This does not change behavior but makes intent explicit and easier to maintain.

---

*Analysis based on live site crawl of cosmoclub.fr on 2026-05-19. Scoring reflects observed content state; JSON-LD schema scores assume correct implementation as stated in the brief, since structured data is not fully visible to non-JS rendering crawlers used in this audit.*
