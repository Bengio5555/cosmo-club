"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ChevronLeft, Keyboard, PackageCheck, Truck, X } from "lucide-react";
import jsQR from "jsqr";
import { PHASE_LABEL, type EquipmentPhase, type EquipmentScanResult } from "@/lib/equipment/shared";
import { recordScan, type ScanItem, type ScanOutcome } from "./actions";

type Flash = {
  result: EquipmentScanResult;
  code: string | null;
  name: string | null;
  contents: string | null;
  expectedOn: string | null;
};

const STORAGE_KEY = "cosmo-scan-name";

const RESULT_UI: Record<EquipmentScanResult, { bg: string; title: string; hint: string }> = {
  ok: { bg: "bg-emerald-600", title: "OK, chargé", hint: "" },
  deja: { bg: "bg-amber-500", title: "Déjà scanné", hint: "Cet élément a déjà été validé pour cette phase." },
  autre_evenement: { bg: "bg-red-600", title: "PAS POUR CET ÉVÉNEMENT", hint: "Ne le charge pas. Repose-le au stock." },
  inconnu: { bg: "bg-red-600", title: "QR inconnu", hint: "Ce code n'est pas un élément Cosmo Club." },
};

type AudioCtx = AudioContext;

/** iOS only lets a page make sound after a tap: the context is created on
 *  the « Départ / Retour » button and reused for every scan afterwards. */
function unlockAudio(ref: { current: AudioCtx | null }) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ref.current) ref.current = new Ctx();
    void ref.current.resume();
    // A silent blip inside the gesture is what actually unlocks Safari.
    const osc = ref.current.createOscillator();
    const gain = ref.current.createGain();
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ref.current.destination);
    osc.start();
    osc.stop(ref.current.currentTime + 0.01);
  } catch {
    /* no audio: colour + vibration still speak */
  }
}

function tone(ctx: AudioCtx, freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** OK: a two-note chime (like a checkout). Refusal: a low double buzz. */
function playResult(ctx: AudioCtx | null, kind: "ok" | "bad") {
  if (!ctx) return;
  try {
    void ctx.resume();
    const t = ctx.currentTime;
    if (kind === "ok") {
      tone(ctx, 1046.5, t, 0.16, "sine", 0.35); // do
      tone(ctx, 1568, t + 0.13, 0.28, "sine", 0.35); // sol
    } else {
      tone(ctx, 180, t, 0.22, "square", 0.25);
      tone(ctx, 150, t + 0.28, 0.32, "square", 0.25);
    }
  } catch {
    /* ignore */
  }
}

export function ScanClient({
  eventId,
  token,
  title,
  subtitle,
  initialItems,
  briefingUrl,
}: {
  eventId: string;
  token: string;
  title: string;
  subtitle: string;
  initialItems: ScanItem[];
  briefingUrl: string;
}) {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<EquipmentPhase | null>(null);
  const [items, setItems] = useState<ScanItem[]>(initialItems);
  const [flash, setFlash] = useState<Flash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<"idle" | "on" | "denied" | "unavailable">("idle");
  const [manual, setManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastRef = useRef<{ raw: string; at: number }>({ raw: "", at: 0 });
  const busyRef = useRef(false);
  const audioRef = useRef<AudioCtx | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Prefill the saved first name straight into the DOM: the input is
  // uncontrolled until « start » reads it, so no state update here.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && nameInputRef.current && !nameInputRef.current.value) {
        nameInputRef.current.value = saved;
      }
    } catch {
      /* private mode */
    }
  }, []);

  const isDone = useCallback(
    (it: ScanItem) => (phase === "depart" ? !!it.depart_at : !!it.retour_at),
    [phase],
  );
  const doneCount = items.filter(isDone).length;
  const missing = items.filter((it) => !isDone(it));

  const submit = useCallback(
    async (raw: string) => {
      if (!phase || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      let res: ScanOutcome;
      try {
        res = await recordScan({ eventId, token, raw, phase, scannedBy: name });
      } catch {
        res = { ok: false, error: "Pas de réseau : réessaie." };
      }
      busyRef.current = false;
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setItems(res.items);
      setFlash({
        result: res.result,
        code: res.equipment?.code ?? null,
        name: res.equipment?.name ?? null,
        contents: res.equipment?.contents ?? null,
        expectedOn: res.expectedOn,
      });
      const good = res.result === "ok";
      try {
        navigator.vibrate?.(good ? 80 : [120, 80, 120, 80, 240]);
      } catch {
        /* no haptics */
      }
      playResult(audioRef.current, good ? "ok" : "bad");
      window.setTimeout(() => setFlash(null), good ? 1400 : 2600);
    },
    [eventId, token, phase, name],
  );

  // Camera loop: draw each frame on a canvas and let jsQR find a code.
  useEffect(() => {
    if (!phase || done || manual) return;
    let cancelled = false;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      // Reported asynchronously: the platform API is the external system here.
      queueMicrotask(() => setCameraState("unavailable"));
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        void video.play();
        setCameraState("on");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const tick = () => {
          if (cancelled) return;
          if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
            const w = Math.min(video.videoWidth, 640);
            const h = Math.round((video.videoHeight / video.videoWidth) * w) || 0;
            if (w && h) {
              canvas.width = w;
              canvas.height = h;
              ctx.drawImage(video, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              const qr = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
              if (qr?.data) {
                const now = Date.now();
                // Same code held in front of the lens: one scan, not fifty.
                if (qr.data !== lastRef.current.raw || now - lastRef.current.at > 3500) {
                  lastRef.current = { raw: qr.data, at: now };
                  void submit(qr.data);
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setCameraState("denied"));
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [phase, done, manual, submit]);

  function start(next: EquipmentPhase) {
    const n = (nameInputRef.current?.value ?? name).trim();
    setName(n);
    if (n.length < 2) {
      setError("Indique ton prénom.");
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, n);
    } catch {
      /* ignore */
    }
    unlockAudio(audioRef);
    setError(null);
    setDone(false);
    setPhase(next);
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    setManualCode("");
    void submit(code);
  }

  // ── Step 1: who + which phase ──
  if (!phase) {
    return (
      <Shell title={title} subtitle={subtitle} briefingUrl={briefingUrl}>
        <div className="space-y-5">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-white">Ton prénom</span>
            <input
              ref={nameInputRef}
              defaultValue={name}
              placeholder="Votre prénom"
              autoComplete="given-name"
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-lg text-white placeholder:text-white/40 focus:border-white/60 focus:outline-none"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <div className="grid gap-3">
            <button
              type="button"
              onClick={() => start("depart")}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-5 text-left text-slate-900 shadow-lg active:scale-[0.98]"
            >
              <Truck className="h-8 w-8 shrink-0" />
              <span>
                <span className="block text-lg font-bold">Départ du stock</span>
                <span className="block text-sm text-slate-600">Je scanne chaque élément avant de le charger.</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => start("retour")}
              className="flex items-center gap-4 rounded-2xl bg-white px-5 py-5 text-left text-slate-900 shadow-lg active:scale-[0.98]"
            >
              <PackageCheck className="h-8 w-8 shrink-0" />
              <span>
                <span className="block text-lg font-bold">Retour au camion</span>
                <span className="block text-sm text-slate-600">Fin d&apos;événement : je scanne tout avant de partir.</span>
              </span>
            </button>
          </div>
          <p className="text-xs text-white/60">
            {items.length} élément{items.length > 1 ? "s" : ""} prévu{items.length > 1 ? "s" : ""} sur cet événement.
          </p>
        </div>
      </Shell>
    );
  }

  // ── Step 3: summary ──
  if (done) {
    const complete = missing.length === 0;
    return (
      <Shell title={title} subtitle={PHASE_LABEL[phase]} briefingUrl={briefingUrl} onBack={() => setDone(false)}>
        <div className={`rounded-2xl p-5 ${complete ? "bg-emerald-600" : "bg-red-600"}`}>
          <p className="text-2xl font-bold text-white">
            {complete ? "Tout est là." : `Il manque ${missing.length} élément${missing.length > 1 ? "s" : ""}`}
          </p>
          <p className="mt-1 text-sm text-white/80">
            {doneCount}/{items.length} scanné{doneCount > 1 ? "s" : ""} · {name}
          </p>
        </div>
        {!complete && (
          <ul className="mt-4 space-y-2">
            {missing.map((it) => (
              <li key={it.id} className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3">
                <p className="font-mono text-xs font-semibold text-red-200">{it.code}</p>
                <p className="font-semibold text-white">{it.name}</p>
                {it.contents && <p className="text-xs text-white/60">{it.contents}</p>}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 w-full rounded-xl bg-white px-4 py-3 font-semibold text-slate-900"
        >
          {complete ? "Revenir au scan" : "Continuer à scanner"}
        </button>
      </Shell>
    );
  }

  // ── Step 2: scanning ──
  const ui = flash ? RESULT_UI[flash.result] : null;
  return (
    <Shell
      title={title}
      subtitle={`${PHASE_LABEL[phase]} · ${name}`}
      briefingUrl={briefingUrl}
      onBack={() => {
        setPhase(null);
        setManual(false);
      }}
    >
      {/* Progress */}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-white/80">
          <span className="text-2xl font-bold text-white">{doneCount}</span>
          <span className="text-white/60"> / {items.length}</span>
        </p>
        <button
          type="button"
          onClick={() => setDone(true)}
          className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900"
        >
          Terminer
        </button>
      </div>

      {/* Camera */}
      {!manual && (
        <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "3 / 4", maxHeight: "60vh" }}>
          <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[62%] w-[72%] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
          {cameraState === "idle" && (
            <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/70">Ouverture de la caméra…</p>
          )}
          {(cameraState === "denied" || cameraState === "unavailable") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center">
              <Camera className="h-8 w-8 text-white/60" />
              <p className="text-sm text-white">
                {cameraState === "denied"
                  ? "Caméra refusée. Autorise-la dans les réglages du navigateur, ou tape le code."
                  : "Caméra indisponible ici. Tape le code écrit sous le QR."}
              </p>
              <button type="button" onClick={() => setManual(true)} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                Taper le code
              </button>
            </div>
          )}
          {busy && <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-white/80" />}
        </div>
      )}

      {manual && (
        <form onSubmit={submitManual} className="rounded-2xl bg-white/10 p-4">
          <label className="block text-sm font-semibold text-white">Code sous le QR</label>
          <div className="mt-2 flex gap-2">
            <input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="CAISSE-07"
              autoCapitalize="characters"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 py-3 font-mono text-lg uppercase text-white placeholder:text-white/30 focus:border-white/60 focus:outline-none"
            />
            <button type="submit" disabled={busy} className="rounded-xl bg-white px-4 font-semibold text-slate-900 disabled:opacity-60">
              OK
            </button>
          </div>
        </form>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-white/60">
        <button type="button" onClick={() => setManual((v) => !v)} className="inline-flex items-center gap-1.5 underline decoration-dotted underline-offset-2">
          {manual ? <Camera className="h-3.5 w-3.5" /> : <Keyboard className="h-3.5 w-3.5" />}
          {manual ? "Revenir à la caméra" : "Taper le code à la main"}
        </button>
        {error && <span className="text-red-300">{error}</span>}
      </div>

      {/* Checklist */}
      <ul className="mt-4 space-y-1.5">
        {items.map((it) => {
          const ok = isDone(it);
          return (
            <li
              key={it.id}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${ok ? "bg-emerald-500/15 text-emerald-100" : "bg-white/5 text-white"}`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${ok ? "bg-emerald-500 text-white" : "border border-white/30"}`}>
                {ok && <Check className="h-4 w-4" />}
              </span>
              <span className="font-mono text-[11px] font-semibold opacity-80">{it.code}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{it.name}</span>
            </li>
          );
        })}
      </ul>

      {/* Full-screen result */}
      {flash && ui && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 text-center text-white ${ui.bg}`} onClick={() => setFlash(null)}>
          {flash.result === "ok" ? <Check className="h-20 w-20" /> : <X className="h-20 w-20" />}
          <p className="mt-4 text-3xl font-extrabold leading-tight">{ui.title}</p>
          {flash.code && (
            <p className="mt-3 text-xl font-semibold">
              {flash.code} · {flash.name}
            </p>
          )}
          {flash.result === "ok" && flash.contents && <p className="mt-2 text-sm text-white/85">Vérifie : {flash.contents}</p>}
          {flash.result === "ok" && (
            <p className="mt-4 text-lg text-white/90">
              {doneCount}/{items.length}
            </p>
          )}
          {flash.expectedOn && <p className="mt-3 text-sm text-white/90">Prévu sur : {flash.expectedOn}</p>}
          {ui.hint && <p className="mt-3 text-sm text-white/85">{ui.hint}</p>}
        </div>
      )}
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  briefingUrl,
  onBack,
  children,
}: {
  title: string;
  subtitle: string;
  briefingUrl: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <div className="mx-auto max-w-md px-4 pb-10 pt-4">
        <header className="mb-5 flex items-start gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Retour" className="mt-0.5 rounded-full bg-white/10 p-2">
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <a href={briefingUrl} aria-label="Retour au brief" className="mt-0.5 rounded-full bg-white/10 p-2">
              <ChevronLeft className="h-5 w-5" />
            </a>
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Cosmo Club · Matériel</p>
            <h1 className="truncate text-lg font-bold">{title}</h1>
            <p className="text-xs text-white/60">{subtitle}</p>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
