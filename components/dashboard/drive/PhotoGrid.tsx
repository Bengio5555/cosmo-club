"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Play, X } from "lucide-react";
import type { DriveItem } from "@/lib/drive/api";
import { downloadUrl, thumbnailUrl } from "@/lib/drive/format";
import { FileIcon } from "./FileIcon";
import { cn } from "@/lib/utils";

export type MediaItem = Pick<
  DriveItem,
  "id" | "name" | "mimeType" | "isVideo" | "hasThumbnail" | "webViewLink"
>;

/**
 * Square thumbnail grid for photos and videos. Photos open in a
 * full-screen viewer (keyboard and swipe); videos open in Drive's player.
 */
export function PhotoGrid({
  items,
  className,
}: {
  items: MediaItem[];
  className?: string;
}) {
  const photos = items.filter((i) => !i.isVideo);
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul
        className={cn(
          "grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8",
          className,
        )}
      >
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              title={item.name}
              onClick={() =>
                item.isVideo
                  ? item.webViewLink && window.open(item.webViewLink, "_blank", "noopener")
                  : setOpen(photos.findIndex((p) => p.id === item.id))
              }
              className="group relative block aspect-square w-full overflow-hidden rounded-md border border-slate-200 bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-grenat)] dark:border-slate-800 dark:bg-slate-900"
            >
              {item.hasThumbnail ? (
                // Plain <img>: thumbnails come from our authenticated proxy,
                // which next/image's optimizer can't call with the session.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumbnailUrl(item.id)}
                  alt={item.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <FileIcon mimeType={item.mimeType} name={item.name} className="h-6 w-6" />
                </span>
              )}
              {item.isVideo && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-black/55 p-2 text-white">
                    <Play className="h-4 w-4 fill-current" aria-hidden />
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {open !== null && photos[open] && (
        <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: MediaItem[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const photo = photos[index];
  const touchX = useRef<number | null>(null);
  const go = useCallback(
    (delta: number) => onIndex((index + delta + photos.length) % photos.length),
    [index, onIndex, photos.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [go, onClose]);

  // Warm the cache for the next photo so arrows feel instant.
  const next = photos[(index + 1) % photos.length];

  const iconBtn =
    "rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.name}
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex items-center gap-2 px-4 py-3 text-white">
        <p className="min-w-0 flex-1 truncate text-sm">{photo.name}</p>
        <span className="text-xs text-white/60">
          {index + 1} / {photos.length}
        </span>
        <a href={downloadUrl(photo.id)} className={iconBtn} aria-label="Télécharger l'original">
          <Download className="h-5 w-5" />
        </a>
        {photo.webViewLink && (
          <a
            href={photo.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className={iconBtn}
            aria-label="Ouvrir dans Google Drive"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        )}
        <button type="button" onClick={onClose} className={iconBtn} aria-label="Fermer">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-6 md:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={thumbnailUrl(photo.id, 1600)}
          alt={photo.name}
          className="max-h-full max-w-full select-none object-contain"
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              className={cn(iconBtn, "absolute left-2 top-1/2 hidden -translate-y-1/2 md:block")}
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className={cn(iconBtn, "absolute right-2 top-1/2 hidden -translate-y-1/2 md:block")}
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
          </>
        )}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnailUrl(next.id, 1600)} alt="" className="hidden" aria-hidden />
    </div>
  );
}
