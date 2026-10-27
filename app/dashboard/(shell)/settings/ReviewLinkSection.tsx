"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { saveGoogleReviewUrl } from "./actions";

/**
 * Carte « Avis Google » de la page Paramètres : le lien envoyé aux
 * clients depuis /dashboard/avis.
 */
export function ReviewLinkSection({ initialUrl }: { initialUrl: string | null }) {
  const router = useRouter();
  const [value, setValue] = useState(initialUrl ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function save() {
    startTransition(async () => {
      setMsg(null);
      const res = await saveGoogleReviewUrl(value);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setValue(res.url ?? "");
      setMsg({ kind: "ok", text: res.url ? "Lien enregistré." : "Lien retiré." });
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-md border border-slate-300 bg-white p-2 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Star className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Avis Google</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Le lien envoyé aux clients depuis la page Avis clients. Dans ta fiche Google
            Business, clique sur « Demander des avis » et colle le lien ici.
          </p>
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Lien pour laisser un avis
        </span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://g.page/r/…/review"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-700 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        />
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex items-center rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {msg && (
          <p
            className={
              msg.kind === "ok"
                ? "text-xs text-emerald-700 dark:text-emerald-400"
                : "text-xs text-red-700 dark:text-red-400"
            }
          >
            {msg.text}
          </p>
        )}
      </div>
    </section>
  );
}
