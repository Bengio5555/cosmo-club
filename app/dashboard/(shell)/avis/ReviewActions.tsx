"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, BellRing, Check, Undo2 } from "lucide-react";
import type { ReviewStage } from "@/lib/reviewFollowup";
import { markReviewReceived, sendReviewReminder, sendReviewRequest } from "./actions";

const primary =
  "inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60";
const secondary =
  "inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

/**
 * Boutons d'une ligne de /dashboard/avis, selon l'étape : demander,
 * relancer (une fois, après 7 jours), marquer l'avis reçu. Chaque envoi
 * confirme le destinataire avant de partir.
 */
export function ReviewActions({
  eventId,
  email,
  stage,
  disabledReason,
}: {
  eventId: string;
  email: string | null;
  stage: ReviewStage;
  /** Raison qui bloque un envoi (pas d'e-mail, pas de lien Google…). */
  disabledReason: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function run(question: string | null, action: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    if (question && !window.confirm(question)) return;
    startTransition(async () => {
      setMsg(null);
      const res = await action();
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error ?? "Erreur." });
        return;
      }
      setMsg({ kind: "ok", text: done });
      router.refresh();
    });
  }

  const received = (
    <button
      type="button"
      disabled={pending}
      className={secondary}
      onClick={() => run(null, () => markReviewReceived(eventId, true), "Noté.")}
    >
      <Check className="h-3.5 w-3.5" />
      Avis reçu
    </button>
  );

  let buttons: React.ReactNode;
  switch (stage.stage) {
    case "to_request":
    case "client_done":
      buttons = disabledReason ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">{disabledReason}</p>
      ) : stage.stage === "to_request" ? (
        <button
          type="button"
          disabled={pending}
          className={primary}
          onClick={() =>
            run(`Envoyer la demande d'avis à ${email} ?`, () => sendReviewRequest(eventId), "Envoyée.")
          }
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? "Envoi…" : "Envoyer la demande"}
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          className={secondary}
          onClick={() =>
            run(
              stage.reason === "reviewed"
                ? `Ce client a déjà laissé un avis. Lui écrire quand même à ${email} ?`
                : `Ce client a déjà reçu une demande il y a moins de 12 mois. Lui écrire quand même à ${email} ?`,
              () => sendReviewRequest(eventId, true),
              "Envoyée.",
            )
          }
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? "Envoi…" : "Envoyer quand même"}
        </button>
      );
      break;
    case "to_remind":
      buttons = (
        <>
          {disabledReason ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{disabledReason}</p>
          ) : (
            <button
              type="button"
              disabled={pending}
              className={primary}
              onClick={() =>
                run(`Envoyer la relance à ${email} ? Elle ne part qu'une fois.`, () => sendReviewReminder(eventId), "Relance envoyée.")
              }
            >
              <BellRing className="h-3.5 w-3.5" />
              {pending ? "Envoi…" : "Relancer"}
            </button>
          )}
          {received}
        </>
      );
      break;
    case "waiting":
    case "reminded":
      buttons = received;
      break;
    case "received":
      buttons = (
        <button
          type="button"
          disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-slate-500 underline-offset-2 hover:underline disabled:opacity-60"
          onClick={() => run("Annuler « Avis reçu » ?", () => markReviewReceived(eventId, false), "Annulé.")}
        >
          <Undo2 className="h-3 w-3" />
          Annuler
        </button>
      );
      break;
  }

  return (
    <div className="flex flex-col items-start gap-1 md:items-end">
      <div className="flex flex-wrap gap-1.5 md:justify-end">{buttons}</div>
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
