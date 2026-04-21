"use client";

import { Reveal } from "@/components/motion/Reveal";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import galleryEventImg from "@/public/brand/ai/gallery-event.png";
import heroBarImg from "@/public/brand/ai/hero-bar.png";
import bentoBarImg from "@/public/brand/ai/bento-bar.png";
import bentoBaristaImg from "@/public/brand/ai/bento-barista.png";
import { useImageConfig } from "@/lib/hooks/useImageConfig";

type Tile = {
  h: number;
  src: string | typeof galleryEventImg;
  label: string;
  object: string;
};

const defaultTiles: Tile[] = [
  { h: 520, src: galleryEventImg, label: "Mariage", object: "center" },
  { h: 340, src: bentoBarImg, label: "Corporate", object: "center" },
  { h: 420, src: heroBarImg, label: "Défilé", object: "right" },
  { h: 380, src: bentoBaristaImg, label: "Privé", object: "center" },
  { h: 460, src: galleryEventImg, label: "Mariage", object: "top" },
  { h: 310, src: heroBarImg, label: "Lancement", object: "left" },
  { h: 540, src: bentoBarImg, label: "Corporate", object: "bottom" },
  { h: 360, src: bentoBaristaImg, label: "Privé", object: "center" },
];

export function EventsGallery() {
  const config = useImageConfig();
  const tiles = useMemo<Tile[]>(() => {
    const evenementImages = config?.pages?.evenements || {};
    const entries = Object.values(evenementImages);
    if (entries.length === 0) return defaultTiles;
    const positions = ["center", "top", "bottom", "left", "right"];
    return entries
      .filter((img) => typeof img.path === "string")
      .map((img, i) => ({
        h: 380 + (i % 3) * 60,
        src: img.path as string,
        label: img.label || img.title || "Événement",
        object: positions[i % positions.length],
      }));
  }, [config]);

  return (
    <section className="relative bg-[color:var(--color-cream-paper)] py-20 text-[color:var(--color-ink-text)] md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-14 flex flex-col md:mb-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="mb-6 text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
              <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-grenat)] opacity-70" />
              Galerie
            </p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Des nuits <br />
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                inoubliables.
              </span>
            </h2>
          </div>
          <Link
            href="/evenements"
            className="group mt-6 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-grenat)] hover:text-[color:var(--color-grenat-glow)] md:mt-0"
          >
            Voir tous les événements
            <span className="h-px w-8 bg-current transition-all duration-500 group-hover:w-12" />
          </Link>
        </Reveal>

        <div className="columns-2 gap-4 md:columns-3 lg:columns-4 lg:gap-6">
          {tiles.map((tile, i) => (
            <figure
              key={i}
              style={{ height: `${tile.h}px` }}
              className="group relative mb-4 break-inside-avoid overflow-hidden rounded-[var(--radius-lg)] shadow-sm transition-shadow duration-500 hover:shadow-md lg:mb-6"
            >
              <Image
                src={tile.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                unoptimized={typeof tile.src === "string"}
                className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.04]"
                style={{ objectPosition: tile.object }}
              />
              {/* Tag visible always */}
              <div className="absolute inset-x-4 top-4 flex items-start justify-between">
                <span className="eyebrow text-[color:var(--color-grenat)] bg-[color:var(--color-espresso)]/50 backdrop-blur-sm px-2 py-1 rounded-sm">
                  {tile.label}
                </span>
              </div>

              {/* Counter visible on hover */}
              <figcaption className="absolute inset-x-4 bottom-4 opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <span className="font-display text-xs text-[color:var(--color-espresso)]/70">
                  {String(i + 1).padStart(2, "0")} / {tiles.length}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
