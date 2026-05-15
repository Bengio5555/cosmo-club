import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import { LE_MAG_VOICE } from "./editorial-line";

type Article = {
  title: string;
  description: string;
  body_md: string;
  tags?: string[] | null;
  keywords?: string[] | null;
};

// ──────────────────────────────────────────────────────────────────────
// Text — GMB rewrite (Anthropic Claude Sonnet)
// ──────────────────────────────────────────────────────────────────────

const GMB_SYSTEM = `${LE_MAG_VOICE}

TÂCHE — Réécrire un article du Mag en post Google Business Profile (GBP).

CONTRAINTES STRICTES :
- Maximum 1450 caractères (la limite GBP est de 1500, on garde une marge).
- Texte autonome : un lecteur qui ne connaît pas l'article doit comprendre. Pas de "comme nous l'expliquons dans l'article".
- Esprit magazine express : un hook éditorial fort, le développement le plus saillant, une phrase de conclusion.
- Mentionner explicitement "Paris" ou "Île-de-France" au moins une fois — c'est crucial pour le SEO local de GBP.
- Pas de titre H1/H2 — GBP rend tout en texte brut. Les ruptures de paragraphes suffisent.
- Pas de markdown (pas de **gras**, pas de *italique*). GBP les affiche tels quels avec les astérisques.
- Terminer par une seule phrase CTA douce — pas d'impératif agressif. Exemple : "Pour imaginer la carte de votre événement, l'équipe Cosmo Club échange volontiers." Pas de lien — GBP n'autorise qu'un seul lien CTA séparé.

FORMAT DE RÉPONSE :
- Renvoie UNIQUEMENT le texte du post, rien d'autre. Pas de préambule, pas de "voici le post :", pas de guillemets autour.`;

export async function generateGmbPost(article: Article): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante côté serveur.");

  const client = new Anthropic({ apiKey });
  const userPrompt = `Article source :

TITRE : ${article.title}

DESCRIPTION : ${article.description}

TAGS : ${(article.tags ?? []).join(", ") || "—"}

MOTS-CLÉS SEO : ${(article.keywords ?? []).join(", ") || "—"}

CORPS (markdown) :
${article.body_md}

Réécris cet article en post GBP selon les règles données. Sortie : uniquement le texte du post.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system: GMB_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  // Concatenate text blocks (Claude can return multiple).
  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Réponse Claude vide.");
  return text;
}

// ──────────────────────────────────────────────────────────────────────
// Image — Cover article + GMB variant (Gemini 2.5 Flash Image)
// ──────────────────────────────────────────────────────────────────────

const IMAGE_BASE = `Photo-realistic editorial still life in the Cosmo Club Paris brand DNA.

VISUAL DNA (must stay identical across all generated covers):
- Premium Parisian cocktail bar aesthetic — nocturnal, sensual, restrained. References: Ruinart editorial, Aesop, M Le Monde Magazine.
- Surface: hand-troweled deep-noir plaster tabletop with subtle warm cream undertones (micro-gradient from #2a1f14 to #ede3c9), faint grain.
- Background: blurred dark grenat curtain folds (~#2a0e0e) with a single soft warm light source from upper-left, painterly fall-off into near-black on the right edge.
- Lighting: one large diffused sidelight (key) + a faint warm rim from the back-left simulating a candle. Long, soft shadows.
- Lens: 85mm equivalent, f/2.0, subtle film grain, slight halation on liquid highlights.
- Colour palette: brand grenat #8B1A1A, antique gold #C9A961, cream #ede3c9, near-black #0A0A0A. NO saturated blues, NO pure whites.

UNIVERSAL RULES:
- No people, no faces, no hands holding things — pure still life.
- No text, no typography, no logos, no watermarks anywhere in the image.
- Garnish or props placed deliberately, never centered, slightly off-axis.
- Editorial, magazine-quality, cinematic. Not commercial, not Instagram-y.`;

function buildCoverPrompt(article: Article, variant: "site" | "gmb"): string {
  const tagsLine = (article.tags ?? []).join(", ");
  const intent =
    variant === "site"
      ? "This frame must work as a 4:3 article cover that the reader sees first on the blog index."
      : "This frame must work as a 1:1 square thumbnail for Google Business Profile (it will be cropped tight to a square).";
  return `${IMAGE_BASE}

SUBJECT OF THIS SPECIFIC FRAME:
Article title — "${article.title}"
Editorial intent — ${article.description}
${tagsLine ? `Themes — ${tagsLine}` : ""}

Compose a still life that evokes the article's topic visually — a cocktail glass, a bar tool, a barista cup, a garnish, an editorial composition appropriate to the theme. Choose the staging that best illustrates the editorial intent.

${intent}

OUTPUT: a single editorial still-life image. No text, no logos.`;
}

type GenImageResult = { bytes: Buffer; mimeType: string };

async function generateImage(prompt: string, aspectRatio: "4:3" | "1:1"): Promise<GenImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante côté serveur.");

  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: prompt,
    config: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        bytes: Buffer.from(part.inlineData.data, "base64"),
        mimeType: part.inlineData.mimeType ?? "image/png",
      };
    }
  }
  throw new Error("Gemini n'a pas renvoyé d'image.");
}

export async function generateArticleCover(article: Article) {
  return generateImage(buildCoverPrompt(article, "site"), "4:3");
}

export async function generateGmbCover(article: Article) {
  return generateImage(buildCoverPrompt(article, "gmb"), "1:1");
}
