"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitMenuChoice } from "./actions";

export type ChoiceCocktail = {
  id: string;
  name: string;
  description: string | null;
  ingredients: string[];
};

export function MenuChoiceForm({
  token,
  cocktails,
  max,
}: {
  token: string;
  cocktails: ChoiceCocktail[];
  max: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const full = chosen.size >= max;

  function toggle(id: string) {
    setErr(null);
    setChosen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < max) next.add(id);
      return next;
    });
  }

  function submit() {
    setErr(null);
    startTransition(async () => {
      const res = await submitMenuChoice(token, [...chosen]);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[color:var(--color-espresso)]">
        Cochez jusqu&apos;à <strong>{max}</strong> cocktail{max > 1 ? "s" : ""} ·{" "}
        <span className="tabular-nums">{chosen.size}/{max}</span> choisi{chosen.size > 1 ? "s" : ""}
      </p>
      <ul className="divide-y divide-[color:var(--color-ash)]/40 rounded-xl border border-[color:var(--color-ash)]/50 bg-white">
        {cocktails.map((c) => {
          const on = chosen.has(c.id);
          const blocked = !on && full;
          return (
            <li key={c.id}>
              <label className={`flex cursor-pointer gap-4 px-5 py-4 transition-colors ${on ? "bg-[color:var(--color-cream)]" : blocked ? "opacity-50" : "hover:bg-[color:var(--color-cream)]/60"}`}>
                <input
                  type="checkbox"
                  checked={on}
                  disabled={blocked || pending}
                  onChange={() => toggle(c.id)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-grenat)]"
                />
                <span className="min-w-0">
                  <span className="block font-display text-lg leading-tight text-[color:var(--color-ink-text)]">{c.name}</span>
                  {c.description && (
                    <span className="mt-1 block text-sm text-[color:var(--color-espresso)]">{c.description}</span>
                  )}
                  {c.ingredients.length > 0 && (
                    <span className="mt-1.5 block text-xs text-[color:var(--color-espresso)]/70">{c.ingredients.join(" · ")}</span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {err && (
        <p className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || chosen.size === 0}
        className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-full bg-[color:var(--color-grenat)] px-8 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-bone)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Validation…" : "Valider mes choix"}
      </button>
    </div>
  );
}
