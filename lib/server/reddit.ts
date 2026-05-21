import "server-only";

/**
 * Reddit public-search client. Uses the unauthenticated JSON endpoint
 * (`reddit.com/r/{sub}/search.json`) — no OAuth, no rate-limit budget
 * to manage. Reddit asks for a descriptive User-Agent on every call;
 * a generic browser UA would be ratelimited harder than a clearly
 * identified script, so we use a Cosmo Club identifier instead.
 *
 * Keywords + subreddits live here so they can be tuned without a
 * migration. Add/remove as the GTM evolves.
 */

const USER_AGENT =
  "web:fr.cosmoclub.lead-monitor:v1.0 (by /u/cosmoclubparis)";

// Subreddits francophones susceptibles d'héberger des discussions sur
// nos services. La liste est large parce que la communauté Reddit FR
// sur les sujets event/wedding est éclatée — r/Mariage compte mais
// les régionales (r/paris, r/lyon…) et r/AskMeuf récupèrent aussi des
// posts d'organisatrices d'EVJF / 30 ans / mariage.
// Note : Reddit est case-insensitive sur les noms de sub, donc
// "mariage" matche aussi r/Mariage (et inversement).
export const TRACKED_SUBREDDITS = [
  // Communautés généralistes FR
  "france",
  "AskFrance",
  "AskMeuf",
  "rance",
  // Communautés event-spécifiques
  "mariage",
  "EVJF",
  "EVG",
  // Métropoles FR (clients potentiels qui cherchent local)
  "paris",
  "lyon",
  "marseille",
  "bordeaux",
  "Toulouse",
  "Nantes",
  "rouen",
  "Quimper",
  // Adjacents (photographes, lifestyle…)
  "Photographie",
] as const;

// Mots-clés alignés sur les pages d'intent du site. Notes importantes :
//   - Reddit search ne fait pas de matching exact par défaut.
//     "bar à cocktails" donne 0 résultats car "à" est ignoré comme
//     stop-word et la recherche devient implicite (AND bar AND cocktails).
//     Les guillemets force le matching de la phrase exacte.
//   - On évite les accents quand on peut (Reddit search tolère mal les
//     diacritiques sur les anciens index).
//   - Les mots-clés sont volontairement courts et précis pour ne pas
//     ramener des centaines de threads bruyants.
export const TRACKED_KEYWORDS = [
  '"bar à cocktails"',
  '"barman privé"',
  '"atelier mixologie"',
  '"vin d\'honneur"',
  '"animation cocktail"',
  '"atelier cocktail"',
  '"cocktail mariage"',
  '"barman mariage"',
  '"team building" cocktail',
  "EVJF cocktail",
  "EVG cocktail",
  "mixologue Paris",
] as const;

export type RedditThread = {
  reddit_id: string;
  subreddit: string;
  title: string;
  url: string;
  permalink: string;
  selftext: string | null;
  author: string | null;
  score: number;
  num_comments: number;
  posted_at: string;
  matched_keyword: string;
};

type RedditSearchResponse = {
  data?: {
    children?: Array<{
      data?: {
        name?: string;
        subreddit?: string;
        title?: string;
        url?: string;
        permalink?: string;
        selftext?: string;
        author?: string;
        score?: number;
        num_comments?: number;
        created_utc?: number;
        over_18?: boolean;
        stickied?: boolean;
      };
    }>;
  };
};

/**
 * Search across ALL of Reddit for a single keyword, then keep only
 * results from our tracked subreddits. Returns up to 25 threads from
 * the last year, sorted by newest first.
 *
 * Why global search + post-filter rather than per-subreddit search:
 *   - Reddit's restrict_sr endpoint is unreliable on small French
 *     subreddits (r/mariage, r/EVJF) and often returns 0 for valid
 *     queries.
 *   - Global search is the most stable endpoint and matches the
 *     mental model of "what would a redditor see if they searched".
 *   - We only consume threads in TRACKED_SUBREDDITS_LC after the call,
 *     so the noise from other subs is dropped.
 *
 * Time window = "year" because the French event-services subreddits
 * are low-traffic; restricting to "month" can return literally zero
 * results for half the keywords.
 */
async function searchGlobal(keyword: string): Promise<RedditThread[]> {
  const params = new URLSearchParams({
    q: keyword,
    sort: "new",
    t: "year",
    limit: "25",
  });
  const url = `https://www.reddit.com/search.json?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    console.warn(`[reddit] fetch failed for "${keyword}":`, err);
    return [];
  }

  if (!res.ok) {
    console.warn(
      `[reddit] "${keyword}" returned HTTP ${res.status} (likely rate-limited or blocked)`,
    );
    return [];
  }

  const json = (await res.json()) as RedditSearchResponse;
  const children = json.data?.children ?? [];

  // Post-filter on subreddit (lowercase compare — Reddit normalizes
  // subreddit names but the search response returns the canonical case).
  const subsLc = new Set(
    TRACKED_SUBREDDITS.map((s) => s.toLowerCase()),
  );

  const matches = children
    .map((c) => c.data)
    .filter((d): d is NonNullable<typeof d> => !!d)
    .filter((d) => !d.over_18 && !d.stickied)
    .filter((d) => d.name && d.title && d.permalink && d.created_utc)
    .filter((d) => d.subreddit && subsLc.has(String(d.subreddit).toLowerCase()))
    .map((d): RedditThread => ({
      reddit_id: String(d.name),
      subreddit: String(d.subreddit),
      title: String(d.title),
      url: String(d.url ?? `https://www.reddit.com${d.permalink}`),
      permalink: `https://www.reddit.com${d.permalink}`,
      selftext: d.selftext ? String(d.selftext).slice(0, 4000) : null,
      author: d.author ? String(d.author) : null,
      score: Number(d.score ?? 0),
      num_comments: Number(d.num_comments ?? 0),
      posted_at: new Date(Number(d.created_utc) * 1000).toISOString(),
      matched_keyword: keyword,
    }));

  console.log(
    `[reddit] "${keyword}": ${children.length} raw / ${matches.length} after sub filter`,
  );
  return matches;
}

/**
 * Sweep all tracked keywords on Reddit's global search and filter to
 * our tracked subreddits. Dedups by reddit_id (a thread that matches
 * multiple keywords only appears once — first match wins).
 *
 * ~10 keywords × 1 global call each = 10 calls, sequential. Total
 * sweep time ~10 seconds. Well under Reddit's unauth rate ceiling.
 */
export async function fetchAllRedditMatches(): Promise<RedditThread[]> {
  const seen = new Map<string, RedditThread>();

  for (const keyword of TRACKED_KEYWORDS) {
    const threads = await searchGlobal(keyword);
    for (const t of threads) {
      if (!seen.has(t.reddit_id)) {
        seen.set(t.reddit_id, t);
      }
    }
  }

  console.log(
    `[reddit] sweep done: ${seen.size} unique threads across ${TRACKED_KEYWORDS.length} keywords`,
  );

  return Array.from(seen.values()).sort(
    (a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at),
  );
}
