"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { cmToPx, downloadLabel, type LabelData } from "./labelPng";

export type LabelItem = LabelData & { id: string; svg: string };

const PRESETS = [3, 5, 7, 10] as const;
const MIN_CM = 2;
const MAX_CM = 20;
const STORAGE_KEY = "cosmo-label-width-cm";

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
    active
      ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
      : "border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-500 dark:hover:text-white"
  }`;

/**
 * Étiquettes QR : choix de la largeur imprimée, puis téléchargement d'un
 * PNG par étiquette. La taille choisie est gardée pour la prochaine fois.
 */
export function LabelsGrid({ labels }: { labels: LabelItem[] }) {
  const [widthCm, setWidthCm] = useState<number>(5);
  const [draft, setDraft] = useState("5");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(STORAGE_KEY));
      if (saved >= MIN_CM && saved <= MAX_CM) {
        queueMicrotask(() => {
          setWidthCm(saved);
          setDraft(String(saved));
        });
      }
    } catch {
      // stockage bloqué : la taille par défaut suffit
    }
  }, []);

  function choose(cm: number) {
    const v = Math.min(MAX_CM, Math.max(MIN_CM, Math.round(cm * 10) / 10));
    setWidthCm(v);
    setDraft(String(v));
    try {
      window.localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // idem
    }
  }

  async function download(l: LabelItem) {
    setErr(null);
    setBusy(l.id);
    try {
      await downloadLabel(l, widthCm);
    } catch {
      setErr(`Le téléchargement de ${l.code} a échoué. Réessaie.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Largeur de l&apos;étiquette imprimée
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {PRESETS.map((cm) => (
            <button key={cm} type="button" className={chip(widthCm === cm)} onClick={() => choose(cm)}>
              {cm} cm
            </button>
          ))}
          <label className="ml-1 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            Autre
            <input
              type="number"
              inputMode="decimal"
              min={MIN_CM}
              max={MAX_CM}
              step={0.5}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                const v = Number(e.target.value.replace(",", "."));
                if (v >= MIN_CM && v <= MAX_CM) choose(v);
              }}
              onBlur={() => setDraft(String(widthCm))}
              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            cm
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Image PNG de {cmToPx(widthCm)} px de large, à 300 points par pouce : elle s&apos;imprime à{" "}
          {String(widthCm).replace(".", ",")}&nbsp;cm sans réglage. La hauteur suit le texte de l&apos;étiquette.
        </p>
        {err && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{err}</p>}
      </div>

      <div className="labels-grid">
        {labels.map((l) => (
          <div key={l.id} className="label-card">
            <div className="label">
              <div dangerouslySetInnerHTML={{ __html: l.svg }} />
              <p className="label-code">{l.code}</p>
              <p className="label-name">{l.name}</p>
              <p className="label-cat">{l.category}</p>
              <p className="label-brand">Cosmo Club Paris</p>
            </div>
            <button
              type="button"
              onClick={() => download(l)}
              disabled={busy === l.id}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              {busy === l.id ? "Préparation…" : `Télécharger (${String(widthCm).replace(".", ",")} cm)`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
