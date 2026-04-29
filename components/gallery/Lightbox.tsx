"use client";

import Image, { type StaticImageData } from "next/image";
import { useCallback, useEffect, useRef } from "react";

export type LightboxSlide = {
  src: string | StaticImageData;
  label?: string;
  alt?: string;
};

type Props = {
  slides: LightboxSlide[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
};

/**
 * Fullscreen image viewer with prev/next navigation, keyboard shortcuts
 * (Esc / ArrowLeft / ArrowRight), backdrop click to close, and body scroll
 * lock while open. Used by EventsGallery but generic enough for any gallery.
 */
export function Lightbox({ slides, index, onClose, onIndexChange }: Props) {
  const isOpen = index !== null;
  const total = slides.length;
  const slide = isOpen ? slides[index] : null;
  const dialogRef = useRef<HTMLDivElement>(null);

  const goPrev = useCallback(() => {
    if (index === null || total === 0) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, total, onIndexChange]);

  const goNext = useCallback(() => {
    if (index === null || total === 0) return;
    onIndexChange((index + 1) % total);
  }, [index, total, onIndexChange]);

  // Keyboard navigation + body scroll lock while open.
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the dialog for accessibility.
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, goPrev, goNext, onClose]);

  if (!isOpen || !slide) return null;

  const src = typeof slide.src === "string" ? slide.src : slide.src.src;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={slide.label ? `Photo — ${slide.label}` : "Photo"}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--color-ink-text)]/95 backdrop-blur-sm outline-none"
      onClick={(e) => {
        // Close only when clicking the backdrop itself, not children.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar: label + counter + close */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 md:px-10 md:py-7">
        <div className="pointer-events-auto flex items-center gap-4">
          {slide.label && (
            <span className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-bone)]/85 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-sm">
              {slide.label}
            </span>
          )}
          <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-bone)]/60">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-[color:var(--color-bone)] backdrop-blur-sm transition-colors hover:bg-[color:var(--color-grenat)]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>

      {/* Prev arrow */}
      {total > 1 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Photo précédente"
          className="absolute left-3 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-[color:var(--color-bone)] backdrop-blur-sm transition-colors hover:bg-[color:var(--color-grenat)] md:left-6 md:h-14 md:w-14"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 6 9 12 15 18" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="relative mx-auto flex h-full w-full items-center justify-center px-14 py-20 md:px-24 md:py-24">
        <div className="relative h-full w-full">
          <Image
            key={src}
            src={src}
            alt={slide.alt || slide.label || ""}
            fill
            sizes="100vw"
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Next arrow */}
      {total > 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Photo suivante"
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-[color:var(--color-bone)] backdrop-blur-sm transition-colors hover:bg-[color:var(--color-grenat)] md:right-6 md:h-14 md:w-14"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </button>
      )}

      {/* Bottom hint (desktop only) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden justify-center pb-6 md:flex">
        <span className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-bone)]/40">
          ← → naviguer · Esc fermer
        </span>
      </div>
    </div>
  );
}
