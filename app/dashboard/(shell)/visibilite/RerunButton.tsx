"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { rerunGeoCheck } from "./actions";

export function RerunButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function run() {
    if (!window.confirm("Relancer les questions maintenant ? Cela prend 2 à 3 minutes et coûte quelques dollars.")) return;
    startTransition(async () => {
      setMsg(null);
      const res = await rerunGeoCheck();
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: `Terminé : cité dans ${res.cited} réponse(s) sur ${res.questions}.` });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Questions en cours…" : "Relancer maintenant"}
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
  );
}
