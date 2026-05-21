"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { saveNewCocktail } from "./actions";

const SUGGESTED_CATEGORIES = [
  "Signature",
  "Classique",
  "Mocktail",
  "Shot",
  "Barista",
];

export function NewCocktailButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function submit(form: FormData) {
    setErr(null);
    startTransition(async () => {
      const res = await saveNewCocktail({
        name: String(form.get("name") || ""),
        description: String(form.get("description") || "") || null,
        category: String(form.get("category") || "") || null,
      });
      if (!res.ok) return setErr(res.error);
      setOpen(false);
      router.push(`/dashboard/cocktails/${res.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        <Plus className="h-3.5 w-3.5" /> Nouvelle recette
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Nouvelle recette
                </p>
                <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Cocktail
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {err && (
              <div className="mb-3 rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
                {err}
              </div>
            )}

            <form action={submit} className="space-y-3">
              <Field label="Nom">
                <input
                  name="name"
                  required
                  autoFocus
                  placeholder="Negroni maison, Spritz Campari…"
                  className={inputCls}
                />
              </Field>
              <Field label="Catégorie">
                <input
                  name="category"
                  list="cat-suggestions"
                  placeholder="Signature, Classique, Mocktail…"
                  className={inputCls}
                />
                <datalist id="cat-suggestions">
                  {SUGGESTED_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Description (facultative)">
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Twist maison, base gin, amertume equilibrée…"
                  className={inputCls}
                />
              </Field>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Créer la recette
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
