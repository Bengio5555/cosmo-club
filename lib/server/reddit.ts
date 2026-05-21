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

// Subreddits Cosmo Club targets — francophones, audience event/wedding.
// Add r/EVJF / r/EVG if they gain traction (small but specific).
export const TRACKED_SUBREDDITS = [
  "mariage",
  "france",
  "AskFrance",
  "paris",
  "EVJF",
] as const;

// Mots-clés alignés sur les pages d'intent du site (mariage, anniversaire,
// entreprise, barman privé, animation cocktail). Le matching est fait par
// Reddit côté search, donc tolérant aux accents. Pas de stopwords ici —
// chaque mot-clé est une phrase autonome.
export const TRACKED_KEYWORDS = [
  "bar à cocktails",
  "barman privé",
  "atelier mixologie",
  "EVJF cocktail",
  "team building cocktail",
  "vin d'honneur",
  "animation cocktail",
  "barista événementiel",
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
 * Search a single subreddit for a single keyword. Returns up to 10
 * threads from the last month, sorted by newest first.
 *
 * Reddit silently rate-limits when we hammer too fast (~60 req/min
 * unauthenticated). The caller sequences requests, so we don't need
 * an internal throttler.
 */
async function searchSubreddit(
  subreddit: string,
  keyword: string,
): Promise<RedditThread[]> {
  const params = new URLSearchParams({
    q: keyword,
    restrict_sr: "true",
    sort: "new",
    t: "month",
    limit: "10",
  });
  const url = `https://www.reddit.com/r/${subreddit}/search.json?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // Reddit JSON peut être servi via CDN, on demande explicitement
      // pas de cache Next côté serveur — on veut les derniers threads.
      cache: "no-store",
    });
  } catch (err) {
    console.warn(`[reddit] fetch failed for r/${subreddit} "${keyword}":`, err);
    return [];
  }

  if (!res.ok) {
    console.warn(
      `[reddit] r/${subreddit} "${keyword}" returned HTTP ${res.status}`,
    );
    return [];
  }

  const json = (await res.json()) as RedditSearchResponse;
  const children = json.data?.children ?? [];

  return children
    .map((c) => c.data)
    .filter((d): d is NonNullable<typeof d> => !!d)
    .filter((d) => !d.over_18 && !d.stickied)
    .filter((d) => d.name && d.title && d.permalink && d.created_utc)
    .map((d): RedditThread => ({
      reddit_id: String(d.name),
      subreddit: String(d.subreddit ?? subreddit),
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
}

/**
 * Sweep all tracked subreddits × all tracked keywords. Dedups by
 * reddit_id (a thread that matches "EVJF cocktail" AND "atelier
 * mixologie" only appears once — first match wins).
 *
 * Sequential on purpose to stay under Reddit's unauth rate limit
 * without bookkeeping. ~5 subs × 8 keywords = 40 calls, each <500ms,
 * so the full sweep finishes in ~20 seconds.
 */
export async function fetchAllRedditMatches(): Promise<RedditThread[]> {
  const seen = new Map<string, RedditThread>();

  for (const subreddit of TRACKED_SUBREDDITS) {
    for (const keyword of TRACKED_KEYWORDS) {
      const threads = await searchSubreddit(subreddit, keyword);
      for (const t of threads) {
        if (!seen.has(t.reddit_id)) {
          seen.set(t.reddit_id, t);
        }
      }
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at),
  );
}
