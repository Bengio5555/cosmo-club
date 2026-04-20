"use client";

import { Reveal } from "@/components/motion/Reveal";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import galleryEventImg from "@/public/brand/ai/gallery-event.png";
import heroBarImg from "@/public/brand/ai/hero-bar.png";
import bentoBarImg from "@/public/brand/ai/bento-bar.png";
import bentoBaristaImg from "@/public/brand/ai/bento-barista.png";

const defaultTiles = [
  { h: 520, src: galleryEventImg, label: "Mariage", object: "center" },
  { h: 340, src: bentoBarImg, label: "Corporate", object: "center" },
  { h: 420, src: heroBarImg, label: "Défilé", object: "right" },
  { h: 380, src: bentoBaristaImg, label: "Privé", object: "center" },
  { h: 460, src: galleryEventImg, label: "Mariage", object: "top" },
  { h: 310, src: heroBarImg, label: "Lancement", object: "left" },
  { h: 540, src: bentoBarImg, label: "Corporate", object: "bottom" },
  { h: 360, src: bentoBaristaImg, label: "Privé", object: "center" },
] as const;

export function EventsGallery() {
  const [tiles, setTiles] = useState(defaultTiles);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const res = await fetch("/api/images-full");
        if (res.ok) {
          const config = await res.json();
          // Get images from evenements section
          const evenementImages = config.pages?.evenements || {};

          if (Object.keys(evenementImages).length > 0) {
            // Convert to tiles array
            const loadedTiles = Object.values(evenementImages).map((img: any, i: number) => ({
              h: 380 + (i % 3) * 60,
              src: img.path,
              label: img.title || "Événement",
              object: ["center", "top", "bottom", "left", "right"][i % 5] as any,
            }));
            setTiles(loadedTiles.length > 0 ? loadedTiles : defaultTiles);
          }
        }
      } catch (err) {
        console.log("Failed to load images, using defaults");
      }
    };

    loadImages();
  }, []);

  return (
    <section className="relative bg-[color:var(--color-cream-paper)] py-28 text-[color:var(--color-ink-text)] md:py-40">
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
                className="object-cover transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.04]"
                style={{ objectPosition: tile.object }}
              />
              <figcaption className="absolute inset-x-4 bottom-4 flex items-end justify-between opacity-0 transition-opacity duration-700 group-hover:opacity-100">
                <span className="eyebrow text-[color:var(--color-grenat)]">{tile.label}</span>
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
