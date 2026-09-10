/**
 * Default Gemini prompts for the site's image slots. Pure module (no
 * server imports) so the Images dashboard can prefill its textarea; the
 * operator edits the text before generating. Prompts are in English —
 * the image model follows it more precisely — and always forbid text
 * and logos, since heroes sit under real typography.
 */

const STYLE = `Realistic editorial photograph in the visual identity of Cosmo Club Paris, a premium mobile cocktail-bar and barista service for events in Paris: palette of cream, deep garnet (#8B1A1A) and antique gold accents; warm natural light; candid and joyful, never stiff or stock-like; shot on a 35 mm lens with shallow depth of field, natural skin tones, true-to-life details. No text, no lettering, no logos, no watermarks.`;

const BY_SLOT: Record<string, string> = {
  "animation-cocktail-paris/hero": `${STYLE}

SCENE — a cocktail-making workshop in a bright Parisian apartment. A small group of five friends in their late twenties and thirties gathered around a sleek mobile cocktail bar; one of them mid-shake with a stainless shaker, laughing, while a professional mixologist in a black shirt guides her hands; the others taste and cheer. On the counter: fresh limes and mint, copper jiggers, crystal glasses, a garnet-coloured cocktail being poured. Tall windows, Haussmann mouldings softly blurred behind, late-afternoon light. Wide 16:9 composition with quiet space in the upper third for a headline.`,
  "bar-a-cocktails/hero": `${STYLE}

SCENE — an elegant mobile cocktail bar at a Parisian evening reception: a mixologist finishing a garnet cocktail with a citrus twist, guests in the soft bokeh behind, glassware catching warm light. Wide 16:9 composition with quiet space in the upper third for a headline.`,
  "barista/hero": `${STYLE}

SCENE — a barista at a mobile coffee bar at a wedding or corporate event, pouring intricate latte art into a cream cup, matcha and golden lattes lined up on the counter, guests blurred behind in warm light. Wide 16:9 composition with quiet space in the upper third for a headline.`,
};

export function defaultSlotPrompt(page: string, key: string): string {
  const exact = BY_SLOT[`${page}/${key}`];
  if (exact) return exact;
  return `${STYLE}

SCENE — an image for the "${page}" page (slot "${key}") of the Cosmo Club Paris website: a premium cocktail or barista moment at a Parisian event, people and drinks together, wide 16:9 composition with quiet space in the upper third for a headline.`;
}
