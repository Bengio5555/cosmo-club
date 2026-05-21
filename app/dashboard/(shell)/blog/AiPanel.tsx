"use client";

import { useState, useTransition } from "react";
import { Sparkles, Copy, Download, Check, RefreshCw } from "lucide-react";
import {
  generateGmbVersion,
  generateCoverImage,
  generateGmbImage,
} from "./actions";

type Props = {
  articleId: string | null;
  initialGmbPost: string | null;
  initialGmbCoverUrl: string | null;
  onCoverGenerated: (url: string) => void;
};

/**
 * The AI panel only makes sense after the article is saved at least
 * once — we need its DB row to fetch title/body and to persist the
 * generated outputs. Until then we show a saver-first hint.
 */
export function AiPanel({
  articleId,
  initialGmbPost,
  initialGmbCoverUrl,
  onCoverGenerated,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<"gmb_text" | "cover" | "gmb_img" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [gmbPost, setGmbPost] = useState(initialGmbPost ?? "");
  const [gmbCover, setGmbCover] = useState(initialGmbCoverUrl ?? "");
  const [copied, setCopied] = useState(false);

  if (!articleId) {
    return (
      <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Sparkles className="h-4 w-4 text-amber-400" />
          Génération IA
        </h2>
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">
          Enregistre une première fois l'article pour activer la génération IA (cover, version GMB, cover GMB carrée).
        </p>
      </section>
    );
  }

  function run(
    key: "gmb_text" | "cover" | "gmb_img",
    fn: () => Promise<{ ok: true } | { ok: false; error: string } | { ok: true; data: { url: string } | { post: string } }>,
  ) {
    setError(null);
    setBusyId(key);
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          setError(result.error);
        } else if ("data" in result) {
          if ("post" in result.data) setGmbPost(result.data.post);
          if ("url" in result.data) {
            if (key === "cover") onCoverGenerated(result.data.url);
            if (key === "gmb_img") setGmbCover(result.data.url);
          }
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  async function copyGmb() {
    if (!gmbPost) return;
    try {
      await navigator.clipboard.writeText(gmbPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Copie impossible — sélectionne le texte manuellement.");
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Sparkles className="h-4 w-4 text-amber-400" />
        Génération IA
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
        Cover éditoriale, version courte pour Google Business, cover carrée GMB. Voix Le Mag, DNA visuelle Cosmo Club.
      </p>

      {error && (
        <div className="mt-3 rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-2 text-[11px] text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Cover article (site) */}
      <div className="mt-4 space-y-2 rounded-md border border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-900 dark:text-white">Cover article (site)</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("cover", () => generateCoverImage(articleId))}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25 px-2.5 py-1 text-[11px] disabled:opacity-50"
          >
            {busyId === "cover" ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {busyId === "cover" ? "Génération…" : "Générer"}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          4:3 dans la palette grenat / cream / or / noir. Remplace la cover actuelle.
        </p>
      </div>

      {/* GMB text */}
      <div className="mt-3 space-y-2 rounded-md border border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-900 dark:text-white">Version GMB (texte)</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("gmb_text", () => generateGmbVersion(articleId))}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25 px-2.5 py-1 text-[11px] disabled:opacity-50"
          >
            {busyId === "gmb_text" ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {busyId === "gmb_text" ? "Génération…" : gmbPost ? "Régénérer" : "Générer"}
          </button>
        </div>
        <textarea
          value={gmbPost}
          onChange={(e) => setGmbPost(e.target.value)}
          rows={8}
          placeholder="Le post optimisé pour Google Business apparaîtra ici. Tu peux l'éditer avant de copier."
          className="block w-full resize-y rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-[12px] leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
        />
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-500">
          <span>{gmbPost.length} / 1500 caractères (limite GBP)</span>
          <button
            type="button"
            disabled={!gmbPost}
            onClick={copyGmb}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-200 hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                Copié
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copier
              </>
            )}
          </button>
        </div>
      </div>

      {/* GMB cover (square) */}
      <div className="mt-3 space-y-2 rounded-md border border-slate-200 dark:border-slate-800 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-900 dark:text-white">Cover GMB (1:1)</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("gmb_img", () => generateGmbImage(articleId))}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25 px-2.5 py-1 text-[11px] disabled:opacity-50"
          >
            {busyId === "gmb_img" ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {busyId === "gmb_img" ? "Génération…" : gmbCover ? "Régénérer" : "Générer"}
          </button>
        </div>
        {gmbCover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gmbCover}
              alt="Cover GMB"
              className="aspect-square w-full rounded-md border border-slate-200 dark:border-slate-800 object-cover"
            />
            <a
              href={gmbCover}
              download={`gmb-cover-${articleId.slice(0, 8)}.png`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] text-slate-700 dark:text-slate-200 hover:border-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-3 w-3" />
              Télécharger pour GBP
            </a>
          </>
        )}
        <p className="text-[10px] text-slate-500 dark:text-slate-500">
          Carrée, même DNA visuelle. À uploader dans le post Google Business avec le texte.
        </p>
      </div>
    </section>
  );
}
