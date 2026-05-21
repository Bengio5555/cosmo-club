"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllRedditMatches } from "@/lib/server/reddit";
import { draftRedditReply } from "@/lib/server/redditDrafter";

const MAX_DRAFTS_PER_RUN = 12;

/**
 * Sweep Reddit + draft replies for any new matches. Idempotent:
 *  - existing reddit_id rows are NOT overwritten (status, draft, notes preserved)
 *  - only newly inserted rows get a Claude draft
 *
 * Pourquoi un cap sur les drafts par run : un run peut ramasser 30+
 * threads d'un coup, ce qui ferait 30 appels Anthropic en série =
 * latence + coût. On en draft 12 max par run, les autres restent en
 * "pending" avec draft_reply = null. Un clic suivant sur "Régénérer"
 * peut combler le reste.
 */
export async function refreshRedditFeed() {
  const supabase = await createClient();
  const admin = createAdminClient();

  let threads;
  try {
    threads = await fetchAllRedditMatches();
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Sweep Reddit échoué.",
    };
  }

  // 1. Find which ones are new (not already in DB).
  const ids = threads.map((t) => t.reddit_id);
  const { data: existingRows } = await supabase
    .from("reddit_threads")
    .select("reddit_id")
    .in("reddit_id", ids.length > 0 ? ids : ["__none__"]);
  const existingIds = new Set((existingRows ?? []).map((r) => r.reddit_id));
  const newThreads = threads.filter((t) => !existingIds.has(t.reddit_id));

  if (newThreads.length === 0) {
    return {
      ok: true as const,
      fetched: threads.length,
      inserted: 0,
      drafted: 0,
    };
  }

  // 2. Insert them with draft_reply = null. Use the admin client so the
  //    insert never trips RLS during a cron call (no auth context).
  const { error: insertErr } = await admin.from("reddit_threads").insert(
    newThreads.map((t) => ({
      reddit_id: t.reddit_id,
      subreddit: t.subreddit,
      title: t.title,
      url: t.url,
      permalink: t.permalink,
      selftext: t.selftext,
      author: t.author,
      score: t.score,
      num_comments: t.num_comments,
      posted_at: t.posted_at,
      matched_keyword: t.matched_keyword,
    })),
  );
  if (insertErr) {
    return { ok: false as const, error: insertErr.message };
  }

  // 3. Generate drafts for up to MAX_DRAFTS_PER_RUN newly-inserted threads.
  //    Sequential so Anthropic's rate limit can never surface.
  const toDraft = newThreads.slice(0, MAX_DRAFTS_PER_RUN);
  let drafted = 0;
  let skipped = 0;
  for (const t of toDraft) {
    const result = await draftRedditReply({
      subreddit: t.subreddit,
      title: t.title,
      body: t.selftext,
    });
    if (result.ok) {
      await admin
        .from("reddit_threads")
        .update({ draft_reply: result.draft, updated_at: new Date().toISOString() })
        .eq("reddit_id", t.reddit_id);
      drafted += 1;
    } else if (result.reason === "skip") {
      await admin
        .from("reddit_threads")
        .update({ status: "skipped", internal_note: "Hors sujet (Claude)" })
        .eq("reddit_id", t.reddit_id);
      skipped += 1;
    }
  }

  revalidatePath("/dashboard/reddit");
  return {
    ok: true as const,
    fetched: threads.length,
    inserted: newThreads.length,
    drafted,
    skipped,
  };
}

/**
 * Re-run Claude on a single thread. Used when the user wants a
 * different draft, or when the first draft failed (Anthropic outage,
 * key missing, etc).
 */
export async function regenerateRedditDraft(id: string) {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("reddit_threads")
    .select("id,subreddit,title,selftext")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) {
    return { ok: false as const, error: error?.message ?? "Thread introuvable" };
  }

  const result = await draftRedditReply({
    subreddit: row.subreddit,
    title: row.title,
    body: row.selftext,
  });
  if (!result.ok) {
    return {
      ok: false as const,
      error:
        result.reason === "skip"
          ? "Claude considère ce thread hors sujet."
          : result.reason === "config"
            ? "ANTHROPIC_API_KEY non configurée."
            : "Anthropic indisponible.",
    };
  }

  await supabase
    .from("reddit_threads")
    .update({ draft_reply: result.draft, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/dashboard/reddit");
  return { ok: true as const };
}

/**
 * Persist a manual edit to the draft. Called when the user tweaks the
 * generated text before copying — we keep the modified version so
 * "Régénérer" doesn't overwrite a hand-crafted reply by mistake.
 */
export async function updateRedditDraft(id: string, draft: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reddit_threads")
    .update({ draft_reply: draft, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/reddit");
  return { ok: true as const };
}

/**
 * Set a thread to "answered" or "skipped" and optionally record a note.
 * Skipping permanently removes it from the default pending feed.
 */
export async function setRedditStatus(
  id: string,
  status: "answered" | "skipped" | "pending",
  note?: string,
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("reddit_threads")
    .update({
      status,
      internal_note: note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/dashboard/reddit");
  return { ok: true as const };
}
