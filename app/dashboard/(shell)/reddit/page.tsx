import { createClient } from "@/lib/supabase/server";
import { RedditFeed } from "./RedditFeed";

type SearchParams = Promise<{ status?: string }>;

export const dynamic = "force-dynamic";

export default async function RedditMonitorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { status } = await searchParams;
  const activeFilter =
    status === "answered" || status === "skipped" || status === "all"
      ? status
      : "pending";

  const supabase = await createClient();

  let query = supabase
    .from("reddit_threads")
    .select(
      "id,reddit_id,subreddit,title,url,permalink,selftext,author,score,num_comments,posted_at,matched_keyword,draft_reply,status,internal_note,updated_at",
    )
    .order("posted_at", { ascending: false })
    .limit(80);

  if (activeFilter !== "all") {
    query = query.eq("status", activeFilter);
  }

  const { data: threads } = await query;

  // Compteurs par statut pour les onglets de filtre.
  const { data: counts } = await supabase
    .from("reddit_threads")
    .select("status");
  const byStatus: Record<string, number> = {
    pending: 0,
    answered: 0,
    skipped: 0,
    all: counts?.length ?? 0,
  };
  for (const row of counts ?? []) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-8 p-6 md:p-10">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-3xl text-white md:text-4xl">
            Reddit — veille &amp; brouillons
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400">
            Threads francophones interceptés sur nos mots-clés (mariage, EVJF,
            atelier mixologie, barman privé…). Pour chaque thread, Claude
            rédige un brouillon de réponse 200-300 mots dans le ton Reddit.
            Tu cliques « Copier », tu postes manuellement — Reddit interdit
            l&apos;automatisation et te bannit si tu shilles.
          </p>
        </div>
      </header>

      <RedditFeed threads={threads ?? []} activeFilter={activeFilter} counts={byStatus} />
    </div>
  );
}
