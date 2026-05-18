"use client";

import Image from "next/image";
import { Check, ImageOff } from "lucide-react";
import { MOODBOARD_MAX } from "./moodboard-config";

export type AvailableImage = { url: string; name: string };

/**
 * Picker grid for the plaquette moodboard. Clicking a thumbnail toggles
 * selection. New picks are appended (preserving order), so the order in
 * `value` matches the rendering order on the plaquette.
 *
 * When `value.length === MOODBOARD_MAX`, unselected tiles are disabled
 * so the owner has to deselect before picking another.
 */
export function MoodboardPicker({
  available,
  value,
  onChange,
  readOnly = false,
}: {
  available: AvailableImage[];
  value: string[];
  onChange: (next: string[]) => void;
  readOnly?: boolean;
}) {
  const selectedSet = new Set(value);

  function toggle(url: string) {
    if (readOnly) return;
    if (selectedSet.has(url)) {
      onChange(value.filter((v) => v !== url));
      return;
    }
    if (value.length >= MOODBOARD_MAX) return;
    onChange([...value, url]);
  }

  if (available.length === 0) {
    return (
      <p className="flex items-center gap-2 py-2 text-xs text-neutral-500">
        <ImageOff className="h-3.5 w-3.5" />
        Aucune photo dans la galerie événements pour le moment. Téléverse
        depuis l&apos;onglet <span className="text-neutral-300">Images</span>.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500">
        <span>
          Photos sélectionnées pour le moodboard de la plaquette ·{" "}
          <span className="text-neutral-300">
            {value.length} / {MOODBOARD_MAX}
          </span>
        </span>
        {value.length > 0 && !readOnly && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[11px] text-neutral-400 underline-offset-2 hover:text-white hover:underline"
          >
            Tout désélectionner
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {available.map((img) => {
          const isSelected = selectedSet.has(img.url);
          const atMax = value.length >= MOODBOARD_MAX;
          const disabled = readOnly || (!isSelected && atMax);
          const order = isSelected ? value.indexOf(img.url) + 1 : null;

          return (
            <button
              key={img.url}
              type="button"
              onClick={() => toggle(img.url)}
              disabled={disabled}
              title={img.name}
              className={`group relative aspect-square overflow-hidden rounded-md border transition-all ${
                isSelected
                  ? "border-[color:var(--color-grenat)] ring-2 ring-[color:var(--color-grenat)]/40"
                  : "border-neutral-800 hover:border-neutral-600"
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
                    <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 font-mono text-[10px] text-white">
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
