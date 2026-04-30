"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, ChevronUp, ChevronDown } from "lucide-react";
import { toggleHomeGalleryImage, moveHomeGalleryImage } from "./actions";

type DecoratedTile = {
  key: string;
  url: string;
  label: string;
  selected: boolean;
  rank: number | null;
};

export function GalleryPicker({ tiles }: { tiles: DecoratedTile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  function toggle(key: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await toggleHomeGalleryImage(key);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function move(key: string, direction: "up" | "down") {
    startTransition(async () => {
      const res = await moveHomeGalleryImage(key, direction);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  if (tiles.length === 0) {
    return (
      <p className="rounded-md border border-neutral-800 bg-neutral-950/60 p-6 text-sm text-neutral-400">
        Aucune photo dans la page « evenements ». Va d&apos;abord en
        ajouter dans{" "}
        <a href="/admin" className="underline hover:text-white">
          l&apos;admin images
        </a>
        .
      </p>
    );
  }

  // Show selected tiles first, in their order, then the rest.
  const ordered = [...tiles].sort((a, b) => {
    if (a.rank != null && b.rank != null) return a.rank - b.rank;
    if (a.rank != null) return -1;
    if (b.rank != null) return 1;
    return a.key.localeCompare(b.key);
  });

  const maxRank = Math.max(0, ...tiles.map((t) => t.rank ?? 0));

  return (
    <>
      {msg && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((tile) => (
          <li
            key={tile.key}
            className={`group relative overflow-hidden rounded-xl border transition-colors ${
              tile.selected
                ? "border-[color:var(--color-grenat)] bg-neutral-900/60"
                : "border-neutral-800 bg-neutral-950/60"
            }`}
          >
            <div className="relative aspect-[4/3] w-full bg-neutral-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tile.url}
                alt={tile.label}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {tile.selected && tile.rank != null && (
                <span
                  className="absolute left-2 top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[color:var(--color-grenat)] px-2 font-display text-xs font-semibold text-[color:var(--color-bone)]"
                  title="Position sur la home"
                >
                  {tile.rank}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate text-xs text-neutral-400">
                  {tile.label}
                </p>
                <p className="truncate text-[10px] text-neutral-600">
                  {tile.key}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {tile.selected && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(tile.key, "up")}
                      disabled={pending || tile.rank === 1}
                      aria-label="Monter"
                      className="rounded p-1 text-neutral-500 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(tile.key, "down")}
                      disabled={pending || tile.rank === maxRank}
                      aria-label="Descendre"
                      className="rounded p-1 text-neutral-500 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => toggle(tile.key)}
                  disabled={pending}
                  aria-label={
                    tile.selected ? "Retirer de la home" : "Ajouter à la home"
                  }
                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    tile.selected
                      ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)]/15 text-[color:var(--color-grenat-glow)]"
                      : "border-neutral-800 bg-neutral-900 text-neutral-300 hover:border-neutral-700 hover:text-white"
                  }`}
                >
                  <Star
                    className={`h-3 w-3 ${tile.selected ? "fill-current" : ""}`}
                  />
                  {tile.selected ? "Sur la home" : "Ajouter"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
