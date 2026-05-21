"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  RotateCw,
  X,
  Eye,
  Inbox,
} from "lucide-react";
import {
  refreshRedditFeed,
  regenerateRedditDraft,
  setRedditStatus,
  updateRedditDraft,
} from "./actions";

type Thread = {
  id: string;
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
  draft_reply: string | null;
  status: "pending" | "answered" | "skipped";
  internal_note: string | null;
  updated_at: string;
};

type Filter = "pending" | "answered" | "skipped" | "all";

export function RedditFeed({
  threads,
  activeFilter,
  counts,
}: {
  threads: Thread[];
  activeFilter: Filter;
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  function onRefresh() {
    setRefreshMsg("Sweep en cours… ~20 s");
    startTransition(async () => {
      const res = await refreshRedditFeed();
      if (!res.ok) {
        setRefreshMsg(`Erreur : ${res.error}`);
        return;
      }
      const parts = [
        `${res.fetched} threads vus`,
        `${res.inserted} nouveau${res.inserted > 1 ? "x" : ""}`,
        `${res.drafted} brouillon${res.drafted > 1 ? "s" : ""}`,
      ];
      if (res.skipped && res.skipped > 0) {
        parts.push(`${res.skipped} hors sujet`);
      }
      setRefreshMsg(parts.join(" · "));
      router.refresh();
    });
  }

  const tabs: { value: Filter; label: string }[] = [
    { value: "pending", label: `À traiter (${counts.pending ?? 0})` },
    { value: "answered", label: `Répondus (${counts.answered ?? 0})` },
    { value: "skipped", label: `Ignorés (${counts.skipped ?? 0})` },
    { value: "all", label: `Tous (${counts.all ?? 0})` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 p-1">
          {tabs.map((t) => {
            const active = t.value === activeFilter;
            return (
              <Link
                key={t.value}
                href={`/dashboard/reddit?status=${t.value}`}
                className={
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "bg-slate-200 dark:bg-neutral-800 text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {refreshMsg && (
            <span className="text-xs text-slate-500 dark:text-neutral-400">{refreshMsg}</span>
          )}
          <button
            onClick={onRefresh}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-md border border-[color:var(--color-grenat)]/40 bg-[color:var(--color-grenat)]/20 px-3 py-1.5 text-xs font-medium text-[color:var(--color-grenat)] transition-colors hover:bg-[color:var(--color-grenat)]/30 disabled:opacity-60"
          >
            <RefreshCw className={"h-3.5 w-3.5 " + (pending ? "animate-spin" : "")} />
            Rafraîchir Reddit
          </button>
        </div>
      </div>

      {threads.length === 0 ? (
        <EmptyState filter={activeFilter} />
      ) : (
        <ul className="space-y-4">
          {threads.map((t) => (
            <ThreadCard key={t.id} thread={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/60 p-10 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400 dark:text-neutral-600" />
      <p className="mt-3 text-sm text-slate-600 dark:text-neutral-400">
        {filter === "pending"
          ? "Aucun thread à traiter pour l'instant. Lance « Rafraîchir Reddit » pour scanner les nouveaux posts."
          : filter === "answered"
            ? "Aucun thread répondu pour le moment."
            : filter === "skipped"
              ? "Aucun thread ignoré."
              : "Aucun thread en base. Lance « Rafraîchir Reddit »."}
      </p>
    </div>
  );
}

function ThreadCard({ thread }: { thread: Thread }) {
  const [draft, setDraft] = useState(thread.draft_reply ?? "");
  const [savingDraft, setSavingDraft] = useState(false);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [showBody, setShowBody] = useState(false);

  const ageDays = Math.max(
    0,
    Math.floor(
      (Date.now() - Date.parse(thread.posted_at)) / (1000 * 60 * 60 * 24),
    ),
  );
  const ageLabel =
    ageDays === 0
      ? "aujourd'hui"
      : ageDays === 1
        ? "il y a 1 jour"
        : `il y a ${ageDays} j`;

  function onCopy() {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function onSaveDraft() {
    if (draft === (thread.draft_reply ?? "")) return;
    setSavingDraft(true);
    startTransition(async () => {
      await updateRedditDraft(thread.id, draft);
      setSavingDraft(false);
    });
  }

  function onRegenerate() {
    startTransition(async () => {
      const res = await regenerateRedditDraft(thread.id);
      if (!res.ok) {
        alert(res.error);
      }
    });
  }

  function onSetStatus(s: "answered" | "skipped" | "pending") {
    startTransition(async () => {
      await setRedditStatus(thread.id, s);
    });
  }

  const statusBadge = {
    pending: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    answered: "bg-green-500/15 text-green-300 border-green-500/30",
    skipped: "bg-neutral-700/30 text-slate-500 dark:text-neutral-400 border-slate-300 dark:border-neutral-700",
  }[thread.status];

  return (
    <li className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950/80 p-5 md:p-6">
      {/* Thread header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900 px-1.5 py-0.5 font-mono text-slate-600 dark:text-neutral-300">
              r/{thread.subreddit}
            </span>
            <span className={"rounded border px-1.5 py-0.5 " + statusBadge}>
              {thread.status === "pending"
                ? "à traiter"
                : thread.status === "answered"
                  ? "répondu"
                  : "ignoré"}
            </span>
            <span className="text-slate-500 dark:text-neutral-500">·</span>
            <span className="text-slate-500 dark:text-neutral-400">
              {ageLabel} · {thread.score} upvotes · {thread.num_comments} comm.
            </span>
            <span className="text-slate-500 dark:text-neutral-500">·</span>
            <span className="text-slate-500 dark:text-neutral-500 italic">
              match « {thread.matched_keyword} »
            </span>
          </div>
          <a
            href={thread.permalink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-baseline gap-1.5 font-display text-lg text-slate-900 dark:text-white hover:text-[color:var(--color-grenat)] md:text-xl"
          >
            {thread.title}
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-500 dark:text-neutral-500" />
          </a>
          {thread.author && (
            <p className="mt-1 text-xs text-slate-500 dark:text-neutral-500">par u/{thread.author}</p>
          )}
        </div>
      </div>

      {/* Optional body preview */}
      {thread.selftext && (
        <div className="mt-3">
          <button
            onClick={() => setShowBody((s) => !s)}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-neutral-500 hover:text-neutral-300"
          >
            <Eye className="h-3 w-3" />
            {showBody ? "Masquer le post" : "Voir le post"}
          </button>
          {showBody && (
            <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md border border-slate-200 dark:border-neutral-800 bg-black/40 p-3 font-sans text-xs leading-relaxed text-slate-600 dark:text-neutral-300">
              {thread.selftext}
            </pre>
          )}
        </div>
      )}

      {/* Draft area */}
      <div className="mt-4 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900/60">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-neutral-800 px-3 py-1.5 text-[10px] uppercase tracking-wider text-slate-500 dark:text-neutral-500">
          <span>Brouillon Claude (éditable avant copie)</span>
          <button
            onClick={onRegenerate}
            disabled={pending}
            className="inline-flex items-center gap-1 text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            <RotateCw className={"h-3 w-3 " + (pending ? "animate-spin" : "")} />
            Régénérer
          </button>
        </div>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={onSaveDraft}
          rows={Math.max(6, Math.min(20, draft.split("\n").length + 2))}
          placeholder={
            thread.draft_reply === null
              ? "Brouillon pas encore généré. Clique « Régénérer » pour lancer Claude."
              : ""
          }
          className="block w-full resize-y border-0 bg-transparent px-3 py-3 text-sm leading-relaxed text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:outline-none"
        />
      </div>

      {/* Action row */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCopy}
            disabled={!draft}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-medium text-slate-900 transition-colors dark:text-white hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-50"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <a
            href={thread.permalink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-neutral-700 bg-slate-100 dark:bg-neutral-900 px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 transition-colors hover:border-slate-400 dark:hover:border-neutral-600"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ouvrir Reddit
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          {thread.status !== "answered" && (
            <button
              onClick={() => onSetStatus("answered")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-300 transition-colors hover:bg-green-500/20 disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Marquer répondu
            </button>
          )}
          {thread.status !== "skipped" && (
            <button
              onClick={() => onSetStatus("skipped")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-slate-500 dark:text-neutral-400 transition-colors hover:border-slate-400 dark:hover:border-neutral-600 hover:text-neutral-200 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Ignorer
            </button>
          )}
          {thread.status !== "pending" && (
            <button
              onClick={() => onSetStatus("pending")}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-neutral-700 px-3 py-1.5 text-xs text-slate-500 dark:text-neutral-400 transition-colors hover:border-slate-400 dark:hover:border-neutral-600 hover:text-neutral-200 disabled:opacity-50"
            >
              Remettre à traiter
            </button>
          )}
        </div>
      </div>

      {savingDraft && (
        <p className="mt-2 text-[10px] text-slate-500 dark:text-neutral-500">Sauvegarde…</p>
      )}
    </li>
  );
}
