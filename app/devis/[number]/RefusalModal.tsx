"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refuseDevis } from "./actions";
import { type QuoteLocale } from "@/lib/i18n/quote-plaquette";
import {
  REFUSAL_COMMENT_MAX,
  REFUSAL_REASONS,
  refusalReasonLabel,
  type RefusalReason,
} from "@/lib/quoteRefusal";

/**
 * Fenêtre de refus d'un devis. Remplace l'ancienne boîte de confirmation
 * du navigateur : le client peut dire pourquoi il refuse (motif et mot
 * libre, tous deux facultatifs), ce qui permet à Cosmo Club de revenir
 * avec une proposition ajustée. Le refus part même sans motif.
 */
export function RefusalModal({
  quoteId,
  number,
  locale = "fr",
  accessToken = null,
  onClose,
}: {
  quoteId: string;
  number: string;
  locale?: QuoteLocale;
  accessToken?: string | null;
  onClose: () => void;
}) {
  const isEn = locale === "en";
  const L = {
    eyebrow: isEn ? "Decline quote" : "Refus du devis",
    title: isEn ? `Decline quote ${number}?` : `Refuser le devis ${number} ?`,
    sub: isEn
      ? "A word on the reason helps us come back with an adjusted proposal. Optional."
      : "Un mot sur la raison nous aide à revenir avec une proposition ajustée. Facultatif.",
    reasonLabel: isEn ? "Reason" : "Motif",
    commentLabel: isEn ? "Anything to add?" : "Une précision ?",
    commentPlaceholder: isEn
      ? "Budget in mind, new date, what was missing…"
      : "Budget envisagé, nouvelle date, ce qui manquait…",
    cancel: isEn ? "Cancel" : "Annuler",
    submit: isEn ? "Confirm decline" : "Confirmer le refus",
    submitting: isEn ? "Sending…" : "Envoi…",
  };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [reason, setReason] = useState<RefusalReason | null>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function submit() {
    startTransition(async () => {
      setErr(null);
      const res = await refuseDevis(quoteId, accessToken, { reason, comment });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="refusal-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="refusal-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onClose();
      }}
    >
      <div className="refusal-modal">
        <header className="refusal-modal-head">
          <p className="refusal-modal-eyebrow">{L.eyebrow}</p>
          <h2 id="refusal-modal-title" className="refusal-modal-title">
            {L.title}
          </h2>
          <p className="refusal-modal-sub">{L.sub}</p>
        </header>

        <div className="refusal-modal-body">
          <fieldset className="refusal-modal-reasons">
            <legend>{L.reasonLabel}</legend>
            {REFUSAL_REASONS.map((r) => (
              <label key={r} className={reason === r ? "refusal-modal-reason on" : "refusal-modal-reason"}>
                <input
                  type="radio"
                  name="refusal-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  disabled={pending}
                />
                <span>{refusalReasonLabel(r, isEn ? "en" : "fr")}</span>
              </label>
            ))}
          </fieldset>

          <label className="refusal-modal-field">
            <span>{L.commentLabel}</span>
            <textarea
              rows={3}
              maxLength={REFUSAL_COMMENT_MAX}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={L.commentPlaceholder}
              disabled={pending}
            />
          </label>

          {err && <p className="refusal-modal-err">{err}</p>}
        </div>

        <footer className="refusal-modal-foot">
          <button type="button" onClick={onClose} disabled={pending} className="refusal-modal-cancel">
            {L.cancel}
          </button>
          <button type="button" onClick={submit} disabled={pending} className="refusal-modal-submit">
            {pending ? L.submitting : L.submit}
          </button>
        </footer>
      </div>

      <style>{`
 .refusal-modal-backdrop {
 position: fixed;
 inset: 0;
 z-index: 60;
 background: rgba(10, 10, 10, 0.78);
 display: flex;
 align-items: center;
 justify-content: center;
 padding: 16px;
 backdrop-filter: blur(6px);
 }
 .refusal-modal {
 background: #fffaf2;
 color: #2a1f14;
 border-radius: 14px;
 width: 100%;
 max-width: 480px;
 max-height: 92vh;
 display: flex;
 flex-direction: column;
 box-shadow: 0 30px 80px rgba(0,0,0,0.45);
 font-family: var(--font-body, system-ui, -apple-system, sans-serif);
 text-align: left;
 }
 .refusal-modal-head {
 padding: 22px 24px 14px;
 border-bottom: 1px solid rgba(42,31,20,0.1);
 }
 .refusal-modal-eyebrow {
 font-size: 10px;
 letter-spacing: 0.28em;
 text-transform: uppercase;
 color: #8b1a1a;
 margin: 0;
 }
 .refusal-modal-title {
 font-family: var(--font-display, Georgia, serif);
 font-size: 22px;
 margin: 4px 0 8px;
 letter-spacing: -0.01em;
 color: #2a1f14;
 }
 .refusal-modal-sub {
 font-size: 13px;
 line-height: 1.5;
 color: #3a2a1e;
 margin: 0;
 }
 .refusal-modal-body {
 padding: 18px 24px;
 overflow-y: auto;
 flex: 1;
 display: flex;
 flex-direction: column;
 gap: 16px;
 }
 .refusal-modal-reasons {
 border: 0;
 padding: 0;
 margin: 0;
 display: flex;
 flex-direction: column;
 gap: 8px;
 }
 .refusal-modal-reasons legend,
 .refusal-modal-field > span {
 font-size: 10px;
 letter-spacing: 0.24em;
 text-transform: uppercase;
 color: #726d63;
 margin-bottom: 8px;
 padding: 0;
 }
 .refusal-modal-reason {
 display: flex;
 align-items: center;
 gap: 10px;
 padding: 11px 12px;
 border: 1px solid rgba(42,31,20,0.18);
 border-radius: 10px;
 font-size: 14px;
 line-height: 1.3;
 cursor: pointer;
 transition: border-color 0.15s, background 0.15s;
 }
 .refusal-modal-reason:hover { border-color: rgba(139,26,26,0.5); }
 .refusal-modal-reason.on {
 border-color: #8b1a1a;
 background: rgba(139, 26, 26, 0.06);
 }
 .refusal-modal-reason input {
 accent-color: #8b1a1a;
 width: 16px;
 height: 16px;
 flex-shrink: 0;
 margin: 0;
 }
 .refusal-modal-field {
 display: flex;
 flex-direction: column;
 }
 .refusal-modal-field textarea {
 border: 1px solid rgba(42,31,20,0.18);
 border-radius: 10px;
 padding: 10px 12px;
 font: inherit;
 font-size: 16px;
 line-height: 1.45;
 color: #2a1f14;
 background: #fff;
 resize: vertical;
 min-height: 76px;
 }
 .refusal-modal-field textarea:focus {
 outline: none;
 border-color: #8b1a1a;
 }
 .refusal-modal-err {
 font-size: 13px;
 color: #8b1a1a;
 margin: 0;
 }
 .refusal-modal-foot {
 display: flex;
 justify-content: flex-end;
 gap: 10px;
 padding: 14px 24px 20px;
 border-top: 1px solid rgba(42,31,20,0.1);
 }
 .refusal-modal-cancel,
 .refusal-modal-submit {
 border-radius: 999px;
 padding: 10px 18px;
 font-size: 12px;
 letter-spacing: 0.14em;
 text-transform: uppercase;
 cursor: pointer;
 font-family: inherit;
 }
 .refusal-modal-cancel {
 background: transparent;
 border: 1px solid rgba(42,31,20,0.25);
 color: #2a1f14;
 }
 .refusal-modal-cancel:hover { background: #f4ecd6; }
 .refusal-modal-submit {
 background: #8b1a1a;
 border: 1px solid #8b1a1a;
 color: #fffaf2;
 }
 .refusal-modal-submit:hover { background: #b5322b; }
 .refusal-modal-submit:disabled,
 .refusal-modal-cancel:disabled {
 opacity: 0.6;
 cursor: default;
 }
 @media (max-width: 480px) {
 .refusal-modal-foot { flex-direction: column-reverse; }
 .refusal-modal-cancel, .refusal-modal-submit { width: 100%; padding: 13px 18px; }
 }
 `}</style>
    </div>
  );
}
