"use client";

import { useState, useTransition } from "react";
import { Wand2, RefreshCw } from "lucide-react";
import { draftArticleFromBrief } from "./actions";
import type { ArticlePersona, ArticleLength, GeneratedArticle } from "@/lib/blog/ai";

type Props = {
  onDraft: (draft: GeneratedArticle) => void;
};

const PERSONAS: { value: ArticlePersona; label: string; hint: string }[] = [
  { value: "mariage", label: "Mariage", hint: "Futurs mariés, wedding planners" },
  { value: "corporate", label: "Corporate", hint: "Direction comm, RH, événementiel B2B" },
  { value: "mixologie", label: "Mixologie", hint: "Amateurs et professionnels du bar" },
  { value: "lifestyle", label: "Lifestyle Paris", hint: "Public urbain, presse magazine" },
];

const LENGTHS: { value: ArticleLength; label: string; words: string }[] = [
  { value: "short", label: "Court", words: "~600 mots" },
  { value: "medium", label: "Moyen", words: "~1100 mots" },
  { value: "long", label: "Long", words: "~1700 mots" },
];

/**
 * Brief → article generator. Only rendered on the /new page, before
 * the article exists in DB. Once the author saves, the editor will
 * show the regular AiPanel (cover + GMB) instead.
 */
export function BriefPanel({ onDraft }: Props) {
  const [topic, setTopic] = useState("");
  const [persona, setPersona] = useState<ArticlePersona>("mariage");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState<ArticleLength>("medium");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onGenerate() {
    if (!topic.trim()) {
      setError("Décris un sujet avant de générer.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await draftArticleFromBrief({
        topic,
        persona,
        length,
        keywords: keywords
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDraft(result.data);
    });
  }

  return (
    <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Wand2 className="h-4 w-4 text-amber-400" />
        Générer l'article avec l'IA
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        Décris le sujet, choisis le public et la longueur — Claude rédige titre, chapô, corps, mots-clés, tags dans la voix Le Mag. Tu pourras tout ajuster ensuite.
      </p>

      <div className="mt-4 space-y-3">
        <Field label="Sujet / Angle">
          <textarea
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='Ex: « Pourquoi le vin d&apos;honneur devient le moment-pivot d&apos;un mariage parisien — et comment penser sa carte cocktails en conséquence »'
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-neutral-600 focus:outline-none"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Public">
            <select
              value={persona}
              onChange={(e) => setPersona(e.target.value as ArticlePersona)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-neutral-600 focus:outline-none"
            >
              {PERSONAS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-500">
              {PERSONAS.find((p) => p.value === persona)?.hint}
            </p>
          </Field>

          <Field label="Longueur">
            <select
              value={length}
              onChange={(e) => setLength(e.target.value as ArticleLength)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-neutral-600 focus:outline-none"
            >
              {LENGTHS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label} ({l.words})
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Mots-clés SEO à viser (optionnel, séparés par virgules)">
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="bar à cocktails mariage, vin d'honneur Paris"
            className="block w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-neutral-600 focus:outline-none"
          />
        </Field>

        <button
          type="button"
          onClick={onGenerate}
          disabled={pending || !topic.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-500/20 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-500/30 disabled:opacity-50"
        >
          {pending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {pending ? "Rédaction en cours… (30-60 s)" : "Générer l'article"}
        </button>

        {error && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-200">
            {error}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
