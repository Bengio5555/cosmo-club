"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2 } from "lucide-react";
import { generateMissingCovers } from "./actions";

/**
 * One-click batch generator. Loops Gemini over every article missing a
 * cover. Side-effect heavy (one Gemini call + one Storage upload per
 * article) — count on ~5-15s per cover.
 */
export function GenerateAllCoversButton({ missingCount }: { missingCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<
    | { kind: "ok"; text: string }
    | { kind: "err"; text: string }
    | null
  >(null);

  function run() {
    if (
      !window.confirm(
        `Lancer la génération Gemini pour ${missingCount} article${
          missingCount > 1 ? "s" : ""
        } sans cover ?\n\nCompte ~10s par image. Ne ferme pas l'onglet pendant.`,
      )
    )
      return;
    startTransition(async () => {
      setMsg(null);
      const res = await generateMissingCovers();
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      const { generated, failed } = res.data;
      if (failed.length === 0) {
        setMsg({
          kind: "ok",
          text: `✓ ${generated.length} cover${generated.length > 1 ? "s" : ""} générée${generated.length > 1 ? "s" : ""}.`,
        });
      } else {
        setMsg({
          kind: "err",
          text: `${generated.length} OK, ${failed.length} en échec : ${failed
            .slice(0, 3)
            .map((f) => `${f.slug} (${f.error})`)
            .join(", ")}${failed.length > 3 ? "…" : ""}`,
        });
      }
      router.refresh();
    });
  }

  if (missingCount === 0) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-neutral-100 transition hover:border-neutral-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImagePlus className="h-3.5 w-3.5" />
        )}
        {pending
          ? "Génération en cours…"
          : `Générer ${missingCount} cover${missingCount > 1 ? "s" : ""} manquante${missingCount > 1 ? "s" : ""}`}
      </button>
      {msg && (
        <p
          className={`max-w-md rounded-md border px-2.5 py-1.5 text-[11px] ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
