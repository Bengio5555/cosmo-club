"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, ExternalLink, Mail, Copy, X, ListTodo } from "lucide-react";
import { decideGeoAction, draftGeoOutreach } from "./actions";

export type TodoItem = {
  key: string;
  title: string;
  detail: string;
  href: string | null;
  hrefLabel: string | null;
  hasArticle: boolean;
};

export type DoneItem = {
  key: string;
  title: string;
  doneOn: string;
  result: string;
  tone: "good" | "neutral" | "waiting";
};

/**
 * Bloc « À faire cette semaine » : trois actions au plus, choisies par
 * les règles de lib/geo/actions.ts. Rien n'est envoyé ni publié depuis
 * ici : les boutons ouvrent la bonne page, marquent l'action, ou
 * préparent un brouillon d'e-mail à copier.
 */
export function TodoBlock({ items, done }: { items: TodoItem[]; done: DoneItem[] }) {
  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <ListTodo className="h-4 w-4 text-slate-500" />
        À faire cette semaine
      </h2>
      {items.length ? (
        <ol className="space-y-3">
          {items.map((item, i) => (
            <TodoRow key={item.key} item={item} index={i + 1} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-slate-500">
          Rien de prioritaire pour l&apos;instant. De nouvelles actions apparaîtront après le prochain passage.
        </p>
      )}

      {done.length > 0 && (
        <details className="group mt-5 border-t border-slate-100 pt-4 dark:border-slate-900">
          <summary className="cursor-pointer list-none text-xs font-medium text-slate-600 dark:text-slate-400">
            Déjà fait ({done.length}) · effet mesuré 4 semaines après
          </summary>
          <ul className="mt-3 space-y-2 text-xs">
            {done.map((d) => (
              <li key={d.key} className="flex flex-col gap-0.5 md:flex-row md:items-center md:justify-between md:gap-4">
                <span className="text-slate-700 dark:text-slate-300">{d.title}</span>
                <span
                  className={
                    d.tone === "good"
                      ? "shrink-0 text-emerald-700 dark:text-emerald-400"
                      : "shrink-0 text-slate-500"
                  }
                >
                  Fait le {d.doneOn} · {d.result}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function TodoRow({ item, index }: { item: TodoItem; index: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const external = !!item.href && /^https?:\/\//.test(item.href);

  function decide(decision: "done" | "snoozed") {
    startTransition(async () => {
      setErr(null);
      const res = await decideGeoAction(item.key, decision);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  function prepare() {
    startTransition(async () => {
      setErr(null);
      const res = await draftGeoOutreach(item.key);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setDraft(res.text);
    });
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr("Copie impossible : sélectionne le texte à la main.");
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <li className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <div className="flex gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 dark:text-white">{item.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{item.detail}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.hasArticle && (
              <button type="button" onClick={prepare} disabled={pending} className={btn}>
                <Mail className="h-3.5 w-3.5" />
                {pending && !draft ? "Rédaction…" : "Préparer l'e-mail"}
              </button>
            )}
            {item.href && item.hrefLabel && (
              <a
                href={item.href}
                target={external ? "_blank" : undefined}
                rel={external ? "nofollow noopener noreferrer" : undefined}
                className={btn}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {item.hrefLabel}
              </a>
            )}
            <button type="button" onClick={() => decide("done")} disabled={pending} className={btn}>
              <Check className="h-3.5 w-3.5" />
              Fait
            </button>
            <button type="button" onClick={() => decide("snoozed")} disabled={pending} className={btn}>
              <Clock className="h-3.5 w-3.5" />
              Plus tard
            </button>
          </div>
          {err && <p className="mt-2 text-xs text-red-700 dark:text-red-400">{err}</p>}
          {draft && (
            <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Brouillon à relire, rien n&apos;est envoyé
                </p>
                <div className="flex gap-1.5">
                  <button type="button" onClick={copy} className={btn}>
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copié" : "Copier"}
                  </button>
                  <button type="button" onClick={() => setDraft(null)} className={btn} aria-label="Fermer le brouillon">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={9}
                className="w-full resize-y rounded-md border border-slate-300 bg-white p-2 text-xs leading-relaxed text-slate-800 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
