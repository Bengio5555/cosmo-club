import "server-only";

/**
 * Reddit search client — OAuth application-only flow.
 *
 * History: this module originally used the unauthenticated
 * `reddit.com/search.json` endpoint. Reddit now hard-blocks those
 * requests (HTTP 403 with an HTML block page, even from residential
 * IPs), which silently killed the veille: every keyword 403'd, every
 * sweep returned 0 threads. The official Data API via OAuth
 * (client_credentials grant → oauth.reddit.com) is the only reliable
 * path, and its free tier (100 QPM) is far above our ~12 calls/sweep.
 *
 * Setup: create an app on https://www.reddit.com/prefs/apps (type
 * "script"), then set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in the
 * environment. Without them, fetchAllRedditMatches throws a clear
 * config error that the dashboard surfaces.
 *
 * Keywords + subreddits live here so they can be tuned without a
 * migration. Add/remove as the GTM evolves.
 */

const USER_AGENT =
  "web:fr.cosmoclub.lead-monitor:v2.0 (by /u/cosmoclubparis)";

/** Module-scope token cache — tokens last 24h, sweeps run weekly, so a
 *  warm serverless instance can reuse one across a whole sweep. */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET non configurés. Crée une app (type « script ») sur reddit.com/prefs/apps puis ajoute les deux variables d'environnement.",
    );
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Authentification Reddit échouée (HTTP ${res.status}) — vérifie REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET.`,
    );
  }
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!json.access_token) {
    throw new Error("Authentification Reddit : réponse sans access_token.");
  }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.token;
}

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
async function searchGlobal(
  keyword: string,
  token: string,
): Promise<RedditThread[]> {
  const params = new URLSearchParams({
    q: keyword,
    sort: "new",
    t: "year",
    limit: "25",
  });
  // oauth.reddit.com = the authenticated Data API host; the public
  // www.reddit.com/search.json endpoint is hard-blocked (403) now.
  const url = `https://oauth.reddit.com/search?${params.toString()}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
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
  // Throws a clear config/auth error if credentials are missing or
  // rejected — surfaced verbatim by the dashboard so the fix is obvious.
  const token = await getAccessToken();
  const seen = new Map<string, RedditThread>();

  for (const keyword of TRACKED_KEYWORDS) {
    const threads = await searchGlobal(keyword, token);
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
