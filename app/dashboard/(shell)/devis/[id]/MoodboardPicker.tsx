"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Check, ImageOff, Loader2, Upload } from "lucide-react";
import { MOODBOARD_MAX } from "./moodboard-config";
import { uploadMoodboardImage } from "./actions";

export type AvailableImage = { url: string; name: string };

/**
 * Picker grid for the plaquette moodboard. Two sections:
 *   1. "Uploadées pour ce devis" — one-off uploads from the editor,
 *      stored in Supabase Storage with a `devis-moodboard__{id}__`
 *      prefix so they never leak into the public event gallery.
 *   2. "Galerie événements" — shared event photos.
 *
 * Clicking a thumbnail toggles selection. New picks are appended so
 * the order in `value` matches the plaquette rendering order. When
 * `value.length === MOODBOARD_MAX`, unselected tiles are disabled.
 */
export function MoodboardPicker({
  quoteId,
  available,
  initialUploads,
  value,
  onChange,
  readOnly = false,
}: {
  quoteId: string;
  available: AvailableImage[];
  initialUploads: AvailableImage[];
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}) {
  // Devis-scoped uploads: server-loaded once, then grown locally as
  // the owner uploads more. Order: newest first.
  const [uploads, setUploads] = useState<AvailableImage[]>(initialUploads);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedSet = new Set(value);
  const atMax = value.length >= MOODBOARD_MAX;

  function toggle(url: string) {
    if (readOnly) return;
    if (selectedSet.has(url)) {
      onChange(value.filter((v) => v !== url));
      return;
    }
    if (atMax) return;
    onChange([...value, url]);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);

    startTransition(async () => {
      setErr(null);
      const res = await uploadMoodboardImage(quoteId, fd);
      if (e.target) e.target.value = "";
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      // Prepend so the newest upload shows first; auto-select unless
      // we've already hit the cap (in which case the owner has to
      // deselect something manually).
      setUploads((prev) => [res.image, ...prev]);
      if (!atMax) onChange([...value, res.image.url]);
    });
  }

  const isEmpty = available.length === 0 && uploads.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-500">
        <span>
          Photos sélectionnées pour le moodboard ·{" "}
          <span className="text-slate-600 dark:text-slate-300">
            {value.length} / {MOODBOARD_MAX}
          </span>
        </span>
        <div className="flex items-center gap-3">
          {value.length > 0 && !readOnly && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[11px] text-slate-500 dark:text-slate-400 underline-offset-2 hover:text-slate-900 dark:hover:text-white hover:underline"
            >
              Tout désélectionner
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Upload className="h-3 w-3" />
              )}
              Uploader une photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      </div>

      {err && (
        <p className="rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-800 dark:text-red-200">
          {err}
        </p>
      )}

      {isEmpty ? (
        <p className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-500">
          <ImageOff className="h-3.5 w-3.5" />
          Aucune photo disponible. Uploade-en une depuis le bouton
          ci-dessus ou ajoute des visuels dans l&apos;onglet{" "}
          <span className="text-slate-600 dark:text-slate-300">Images</span>.
        </p>
      ) : (
        <>
          {uploads.length > 0 && (
            <ImageGrid
              label="Uploadées pour ce devis"
              images={uploads}
              selectedSet={selectedSet}
              atMax={atMax}
              readOnly={readOnly}
              value={value}
              onToggle={toggle}
            />
          )}
          {available.length > 0 && (
            <ImageGrid
              label="Galerie événements"
              images={available}
              selectedSet={selectedSet}
              atMax={atMax}
              readOnly={readOnly}
              value={value}
              onToggle={toggle}
            />
          )}
        </>
      )}
    </div>
  );
}

function ImageGrid({
  label,
  images,
  selectedSet,
  atMax,
  readOnly,
  value,
  onToggle,
}: {
  label: string;
  images: AvailableImage[];
  selectedSet: Set<string>;
  atMax: boolean;
  readOnly: boolean;
  value: string[];
  onToggle: (url: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {images.map((img) => {
          const isSelected = selectedSet.has(img.url);
          const disabled = readOnly || (!isSelected && atMax);
          const order = isSelected ? value.indexOf(img.url) + 1 : null;
          return (
            <button
              key={img.url}
              type="button"
              onClick={() => onToggle(img.url)}
              disabled={disabled}
              title={img.name}
              className={`group relative aspect-square overflow-hidden rounded-md border transition-all ${
                isSelected
                  ? "border-[color:var(--color-grenat)] ring-2 ring-[color:var(--color-grenat)]/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600"
              } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
            >
              <Image
                src={img.url}
                alt={img.name}
                fill
                sizes="(min-width: 1024px) 160px, (min-width: 768px) 25vw, 33vw"
                className="object-cover"
                unoptimized
              />
              {isSelected && (
                <>
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--color-grenat)] text-[color:var(--color-bone)]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                  {order !== null && (
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-900 dark:text-white">
                      {order}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
