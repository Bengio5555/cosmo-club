"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import { acceptDevis } from "./actions";
import { type QuoteLocale } from "@/lib/i18n/quote-plaquette";

/**
 * Two-step acceptance modal:
 *  1. read & accept CGV (link + mandatory checkbox)
 *  2. type the signer's name + draw a finger/mouse signature
 *
 * Submit calls acceptDevis() with the signature payload. The server
 * captures IP + timestamp, persists everything, and triggers the
 * confirmation email to both parties.
 */
export function AcceptanceModal({
  quoteId,
  number,
  defaultName,
  locale = "fr",
  onClose,
}: {
  quoteId: string;
  number: string;
  defaultName?: string;
  locale?: QuoteLocale;
  onClose: () => void;
}) {
  const isEn = locale === "en";
  const L = {
    cgvError: isEn
      ? "You must accept the terms before signing."
      : "Tu dois accepter les CGV avant de signer.",
    nameError: isEn
      ? "Please enter your full name to sign."
      : "Indique ton nom complet pour la signature.",
    inkError: isEn
      ? "Please draw your signature in the box above."
      : "Trace ta signature dans le cadre prévu.",
    eyebrow: isEn ? "Quote acceptance" : "Acceptation devis",
    sub: isEn
      ? "To finalise, please read and accept the terms below then sign. A copy will be sent to your email."
      : "Pour finaliser, lis et accepte les conditions générales puis signe ci-dessous. Une copie te sera envoyée par email.",
    cgvCheckLead: isEn
      ? "I have read and I accept the "
      : "J'ai lu et j'accepte les ",
    cgvCheckLink: isEn
      ? "general terms and conditions of sale"
      : "conditions générales de vente",
    cgvFrenchOnly: isEn
      ? "Note: the legal terms (CGV) are governed by French law and provided in French only. Get in touch if you need an English overview before signing."
      : null,
    nameLabel: isEn ? "Full name of the signatory" : "Nom complet du signataire",
    namePlaceholder: isEn ? "First and last name" : "Prénom Nom",
    signatureLabel: isEn ? "Signature" : "Signature",
    padHint: isEn
      ? "Sign with your finger or mouse"
      : "Signe avec le doigt ou la souris",
    clear: isEn ? "Clear" : "Effacer",
    cancel: isEn ? "Cancel" : "Annuler",
    submitting: isEn ? "Signing…" : "Signature en cours…",
    submit: isEn ? "Confirm & sign" : "Confirmer & signer",
  };
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [name, setName] = useState(defaultName ?? "");
  const [accepted, setAccepted] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to its container with proper devicePixelRatio so the
  // drawn line stays crisp on retina screens. Re-runs on viewport
  // changes — keeps the strokes intact by snapshotting + replaying.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas || !ctx) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cssW = Math.max(1, Math.floor(rect.width));
      const cssH = 180;
      // Snapshot current ink before resize so we don't lose it.
      const snapshot =
        canvas.width > 0 && canvas.height > 0
          ? canvas.toDataURL("image/png")
          : null;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      canvas.width = cssW * dpr;
      canvas.height = cssH * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#0a0a0a";
      if (snapshot) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, cssW, cssH);
        img.src = snapshot;
      }
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  // Escape closes (unless we're submitting).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, pending]);

  function localPos(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = localPos(e);
    if (!canvas || !ctx || !pt) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPosRef.current = pt;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    // Draw a tiny dot so single taps register too.
    ctx.lineTo(pt.x + 0.1, pt.y + 0.1);
    ctx.stroke();
    setHasInk(true);
  }

  function moveDraw(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const pt = localPos(e);
    if (!canvas || !ctx || !pt) return;
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPosRef.current = pt;
  }

  function endDraw(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // No-op: pointer might already be released.
      }
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setHasInk(false);
  }

  function submit() {
    setErr(null);
    if (!accepted) {
      setErr(L.cgvError);
      return;
    }
    if (!name.trim()) {
      setErr(L.nameError);
      return;
    }
    if (!hasInk) {
      setErr(L.inkError);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    startTransition(async () => {
      const res = await acceptDevis({
        quoteId,
        signerName: name.trim(),
        signatureDataUrl: dataUrl,
      });
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
      role="dialog"
      aria-modal="true"
      aria-label={isEn ? `Sign quote ${number}` : `Signer le devis ${number}`}
      onClick={() => !pending && onClose()}
      className="acceptance-modal-backdrop"
    >
      <div
        className="acceptance-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="acceptance-modal-head">
          <p className="acceptance-modal-eyebrow">{L.eyebrow}</p>
          <h2 className="acceptance-modal-title">{number}</h2>
          <p className="acceptance-modal-sub">{L.sub}</p>
        </header>

        <div className="acceptance-modal-body">
          <label className="acceptance-modal-check">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <span>
              {L.cgvCheckLead}
              <a
                href="/cgv"
                target="_blank"
                rel="noopener noreferrer"
                className="acceptance-modal-link"
              >
                {L.cgvCheckLink}
              </a>
              .
            </span>
          </label>

          {L.cgvFrenchOnly && (
            <p className="acceptance-modal-cgv-note">{L.cgvFrenchOnly}</p>
          )}

          <label className="acceptance-modal-field">
            <span>{L.nameLabel}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.namePlaceholder}
              autoComplete="name"
            />
          </label>

          <div className="acceptance-modal-field">
            <span>{L.signatureLabel}</span>
            <div className="acceptance-modal-padwrap">
              <canvas
                ref={canvasRef}
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerCancel={endDraw}
                onPointerLeave={endDraw}
                style={{ touchAction: "none" }}
              />
              {!hasInk && (
                <span className="acceptance-modal-padhint">{L.padHint}</span>
              )}
              <button
                type="button"
                onClick={clearCanvas}
                disabled={!hasInk || pending}
                className="acceptance-modal-padclear"
              >
                {L.clear}
              </button>
            </div>
          </div>

          {err && <p className="acceptance-modal-err">{err}</p>}
        </div>

        <footer className="acceptance-modal-foot">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="acceptance-modal-cancel"
          >
            {L.cancel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="acceptance-modal-submit"
          >
            {pending ? L.submitting : L.submit}
          </button>
        </footer>
      </div>

      <style>{`
        .acceptance-modal-backdrop {
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
        .acceptance-modal {
          background: #fffaf2;
          color: #2a1f14;
          border-radius: 14px;
          width: 100%;
          max-width: 540px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 30px 80px rgba(0,0,0,0.45);
          font-family: var(--font-body, system-ui, -apple-system, sans-serif);
        }
        .acceptance-modal-head {
          padding: 22px 24px 14px;
          border-bottom: 1px solid rgba(42,31,20,0.1);
        }
        .acceptance-modal-eyebrow {
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8b1a1a;
          margin: 0;
        }
        .acceptance-modal-title {
          font-family: var(--font-display, Georgia, serif);
          font-size: 24px;
          margin: 4px 0 8px;
          letter-spacing: -0.01em;
        }
        .acceptance-modal-sub {
          font-size: 13px;
          line-height: 1.5;
          color: #3a2a1e;
          margin: 0;
        }
        .acceptance-modal-body {
          padding: 18px 24px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .acceptance-modal-check {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          line-height: 1.5;
          cursor: pointer;
        }
        .acceptance-modal-check input {
          margin-top: 3px;
          accent-color: #8b1a1a;
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }
        .acceptance-modal-link {
          color: #8b1a1a;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .acceptance-modal-cgv-note {
          font-size: 12px;
          line-height: 1.5;
          color: #3a2a1e;
          margin: -8px 0 0;
          padding: 10px 12px;
          background: rgba(139, 26, 26, 0.06);
          border-left: 2px solid #8b1a1a;
          border-radius: 0 6px 6px 0;
        }
        .acceptance-modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .acceptance-modal-field > span {
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #726d63;
          font-weight: 600;
        }
        .acceptance-modal-field input[type="text"] {
          padding: 10px 12px;
          border: 1px solid rgba(42,31,20,0.18);
          border-radius: 8px;
          background: #fff;
          color: #2a1f14;
          font-size: 14px;
          font-family: inherit;
        }
        .acceptance-modal-field input[type="text"]:focus {
          outline: none;
          border-color: #8b1a1a;
        }
        .acceptance-modal-padwrap {
          position: relative;
          border: 1px dashed rgba(42,31,20,0.28);
          border-radius: 8px;
          background: #fff;
          height: 180px;
          overflow: hidden;
        }
        .acceptance-modal-padwrap canvas {
          display: block;
          width: 100%;
          height: 100%;
        }
        .acceptance-modal-padhint {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(114,109,99,0.7);
          font-size: 12px;
          pointer-events: none;
          letter-spacing: 0.06em;
        }
        .acceptance-modal-padclear {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #fff;
          border: 1px solid rgba(42,31,20,0.16);
          border-radius: 6px;
          padding: 3px 8px;
          font-size: 11px;
          color: #3a2a1e;
          cursor: pointer;
        }
        .acceptance-modal-padclear:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .acceptance-modal-err {
          background: rgba(139,26,26,0.08);
          border-left: 3px solid #8b1a1a;
          padding: 10px 12px;
          font-size: 13px;
          color: #5a1010;
          border-radius: 4px;
          margin: 0;
        }
        .acceptance-modal-foot {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          padding: 14px 24px 18px;
          border-top: 1px solid rgba(42,31,20,0.1);
        }
        .acceptance-modal-cancel,
        .acceptance-modal-submit {
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          border: 1px solid transparent;
          transition: background-color 0.15s ease;
        }
        .acceptance-modal-cancel {
          background: #fff;
          border-color: rgba(42,31,20,0.2);
          color: #3a2a1e;
        }
        .acceptance-modal-cancel:hover { background: #f4ecd6; }
        .acceptance-modal-submit {
          background: #8b1a1a;
          color: #fffaf2;
        }
        .acceptance-modal-submit:hover { background: #b5322b; }
        .acceptance-modal-submit:disabled,
        .acceptance-modal-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
