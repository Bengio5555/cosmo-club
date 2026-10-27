"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw } from "lucide-react";
import { sendReviewRequest } from "./actions";

/**
 * Bouton d'une ligne de /dashboard/avis. Confirme le destinataire avant
 * l'envoi (et avant un renvoi), puis affiche le résultat sous le bouton.
 */
export function SendReviewButton({
  eventId,
  email,
  alreadySent,
  disabledReason,
}: {
  eventId: string;
  email: string | null;
  alreadySent: boolean;
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function send() {
    const question = alreadySent
      ? `Une demande a déjà été envoyée. La renvoyer à ${email} ?`
      : `Envoyer la demande d'avis à ${email} ?`;
    if (!window.confirm(question)) return;
    startTransition(async () => {
      setMsg(null);
      const res = await sendReviewRequest(eventId);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setMsg({ kind: "ok", text: "Envoyée." });
      router.refresh();
    });
  }

  if (disabledReason) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">{disabledReason}</p>;
  }

  const Icon = alreadySent ? RotateCcw : Send;
  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <button
        type="button"
        onClick={send}
        disabled={pending}
        className={
          alreadySent
            ? "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            : "inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        }
      >
        <Icon className="h-3.5 w-3.5" />
        {pending ? "Envoi…" : alreadySent ? "Renvoyer" : "Envoyer la demande"}
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
