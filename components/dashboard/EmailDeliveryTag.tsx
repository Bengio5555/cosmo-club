"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mail } from "lucide-react";
import {
  deliveryState,
  deliveryTimeline,
  formatDeliveryDate,
  type DeliveryTone,
  type QuoteEmail,
} from "@/lib/quoteEmail";

const toneCls: Record<DeliveryTone, string> = {
  neutral:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
  warn: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
  problem:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300",
};

const BUBBLE_WIDTH = 256;

/**
 * Pastille « e-mail du devis » : Parti / Remis / Ouvert / Retardé /
 * Non remis / Signalé spam / Échec d'envoi. Le détail (destinataire,
 * dates, motif) s'ouvre aussitôt au survol, au clavier ou au toucher.
 * La bulle est en position fixe pour ne pas être rognée par les cartes
 * (overflow-hidden) de la liste.
 */
export function EmailDeliveryTag({ email }: { email: QuoteEmail }) {
  const s = deliveryState(email);
  const steps = deliveryTimeline(email);
  const detail = email.problem_detail || email.error;
  const bubbleId = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(
      8,
      Math.min(r.left, window.innerWidth - BUBBLE_WIDTH - 8),
    );
    setPos({ top: r.bottom + 6, left });
  }
  const close = () => setPos(null);

  // A fixed bubble would drift away from its tag on scroll: close it.
  useEffect(() => {
    if (!pos) return;
    const onScroll = () => setPos(null);
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [pos]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        // Touch: a tap opens it, tapping elsewhere closes it (blur).
        onClick={open}
        aria-describedby={pos ? bubbleId : undefined}
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${toneCls[s.tone]}`}
      >
        <Mail className="h-2.5 w-2.5" aria-hidden />
        <span className="sr-only">E-mail : </span>
        {s.label}
      </button>
      {pos && (
        <div
          id={bubbleId}
          role="tooltip"
          style={{ top: pos.top, left: pos.left, width: BUBBLE_WIDTH }}
          className="pointer-events-none fixed z-50 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case tracking-normal text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {email.recipient && (
            <p className="mb-2 truncate text-slate-500 dark:text-slate-400">
              À {email.recipient}
            </p>
          )}
          <dl className="space-y-0.5">
            {steps.map((st) => (
              <div key={st.label} className="flex justify-between gap-3">
                <dt>{st.label}</dt>
                <dd className="tabular-nums text-slate-500 dark:text-slate-400">
                  {formatDeliveryDate(st.at)}
                </dd>
              </div>
            ))}
          </dl>
          {detail && (
            <p className="mt-2 break-words text-red-700 dark:text-red-300">
              Motif : {detail}
            </p>
          )}
          <p className="mt-2 text-slate-500 dark:text-slate-400">{s.hint}</p>
        </div>
      )}
    </>
  );
}
