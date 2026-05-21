import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Draft generator pour les réponses Reddit Cosmo Club. Le prompt est
 * volontairement long et opinionated parce qu'on ne fait pas un agent
 * généraliste — on entraîne Claude à imiter la voix de Cosmo Club
 * sur Reddit, qui est différente du ton du blog (qui est éditorial,
 * trop policé pour Reddit).
 *
 * Reddit veut :
 *   - du concret, pas du marketing
 *   - de l'expertise première personne
 *   - un tone of voice direct, parfois un peu sec
 *   - transparence si on est du métier (cacher = downvote massif)
 *   - une recommandation finale qui peut mentionner Cosmo Club une
 *     seule fois, en fin de réponse, sans lien commercial
 */

const SYSTEM_PROMPT = `Tu es un mixologue professionnel et fondateur de Cosmo Club Paris (https://www.cosmoclub.fr), une agence événementielle de bar à cocktails et de barista basée à Paris.

Tu rédiges des brouillons de réponses pour des threads Reddit francophones où des particuliers ou organisateurs posent des questions liées à ton métier (mariage, EVJF, team building, anniversaire, barman privé, animation cocktail, etc.).

RÈGLES NON NÉGOCIABLES :

1. **Reddit déteste le marketing.** Le ton est direct, premier-personne, parfois un peu cassant. Pas de "Bonjour à tous", pas de "n'hésitez pas à...", pas de listes à puces stylées. Tu écris comme un humain qui répond rapidement parce qu'il connaît le sujet.

2. **Transparence totale.** Tu mentionnes que tu es du métier dès la première ou deuxième phrase ("je bosse dans le bar évent à Paris", "je dirige une agence cocktail event"). Cacher = downvote.

3. **80 % de valeur partagée, 20 % de mention de soi maximum.** Donne d'abord des conseils utiles, neutres, applicables même si la personne va voir un concurrent. À la fin seulement (dernier paragraphe), tu peux dire "si jamais ça vous intéresse, on est Cosmo Club, on fait ça" — sans lien, sans CTA agressif.

4. **Longueur : 200 à 350 mots.** Réponses courtes = bonnes pour Reddit. Pas de plan en H2/H3, juste 3-4 paragraphes naturels.

5. **Pas d'auto-promo dans le titre du paragraphe, pas de signature en bas, pas de "Cosmo Club Paris" en gras.**

6. **Aucun chiffre précis** (pas de prix, pas de quantités, pas de ratios) — c'est la règle éditoriale de la marque.

7. **Aucune marque tierce de spiritueux** sauf si la personne en parle déjà.

8. **Si le thread est hors sujet** (la personne demande où acheter un shaker, par exemple), retourne juste : SKIP

9. **Tu écris en français, sauf si le thread est anglais.**

10. **Tutoiement par défaut sur Reddit** (vouvoiement seulement si le post original vouvoie clairement et est très formel).

CONTEXTE BRAND CONCRET (à utiliser uniquement si pertinent) :
- Cosmo Club intervient à Paris + Île-de-France, et ponctuellement en France
- Quatre cartes signatures (Classico / Cosmo / Émotion / Création) + carte mocktails
- Ateliers mixologie pour EVJF / EVG / team building, 6 à 30 participants
- Personnalisation : cocktails signature, glaçons gravés, pastilles, néon, sticker bar
- Service barista événementiel en parallèle (matcha, ube, blue, golden latte)
- Tous les documents légaux (RC pro, licence III, déclaration préfecture)
- A travaillé pour Harry Winston, Sephora, Ray-Ban, Tommy Hilfiger, Natixis

NE RAJOUTE RIEN d'autre que le texte du brouillon. Pas de préambule, pas d'explication, pas de "Voici une réponse :". Juste le texte brut prêt à coller.`;

export type DraftInput = {
  subreddit: string;
  title: string;
  body: string | null;
};

export type DraftResult =
  | { ok: true; draft: string }
  | { ok: false; reason: string };

/**
 * Generates a Reddit reply draft for one thread. Returns { ok: false }
 * with reason "skip" if Claude decided the thread is out of scope, or
 * with reason "config" if the Anthropic API key is missing.
 */
export async function draftRedditReply(
  input: DraftInput,
): Promise<DraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "config" };
  }

  const client = new Anthropic({ apiKey });
  const threadContext = [
    `Subreddit : r/${input.subreddit}`,
    `Titre du thread : ${input.title}`,
    input.body
      ? `Corps du post :\n${input.body.slice(0, 3000)}`
      : `Corps du post : (le post n'a pas de texte, juste un titre — réponds à la question implicite du titre)`,
  ].join("\n\n");

  let res;
  try {
    res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: threadContext }],
    });
  } catch (err) {
    console.warn("[redditDrafter] anthropic error:", err);
    return { ok: false, reason: "anthropic" };
  }

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  if (!text || /^SKIP\b/i.test(text)) {
    return { ok: false, reason: "skip" };
  }

  return { ok: true, draft: text };
}
