import Image from "next/image";
import type { PublicClientLogo } from "@/lib/server/clientLogos";

const FALLBACK_CLIENTS = [
  "Chanel",
  "LVMH",
  "Louis Vuitton",
  "Dior",
  "Hermès",
  "Moët & Chandon",
  "Ruinart",
  "Cartier",
  "Le Bristol",
  "Four Seasons",
  "Le Meurice",
  "Kering",
];

/**
 * "Ils nous ont fait confiance" marquee. When the owner has uploaded
 * client logos in /dashboard/logos, we render the images at a fixed
 * 48-px height with `object-contain` so wide and narrow logos line
 * up consistently. Without uploads, we fall back to the original
 * typographic word list so the homepage never looks empty.
 */
export function ClientsMarquee({
  logos = [],
}: {
  logos?: PublicClientLogo[];
}) {
  const useLogos = logos.length > 0;
  // Repeat the source 4× (instead of 2×) so each "half" of the track
  // is wide enough to cover the viewport on standard desktops. With
  // only 2 copies, translateX(-50%) leaves a void on the right side
  // of any viewport wider than a single logo set.
  const logoBlock = useLogos ? Array(4).fill(logos).flat() : null;
  const wordBlock = !useLogos
    ? Array(4)
        .fill(FALLBACK_CLIENTS.map((c) => c.toUpperCase()))
        .flat()
    : null;

  return (
    <section
      aria-label="Ils nous ont fait confiance"
      className="border-y border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream)] py-14 text-[color:var(--color-ink-text)]"
    >
      <p className="mb-8 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
        <span aria-hidden className="h-px w-12 bg-[color:var(--color-grenat)] opacity-70" />
        Ils nous ont fait confiance
        <span aria-hidden className="h-px w-12 bg-[color:var(--color-grenat)] opacity-70" />
      </p>
      <div className="marquee edge-fade-x relative overflow-hidden">
        <div
          className="marquee-track items-center gap-5 md:gap-8"
          // Inline override of the 55-s default — the strip is shorter
          // than the cocktail/barista marquees (one logo per slot vs.
          // long word strings) so it needs a tighter loop to feel like
          // it's actually scrolling.
          style={{ animationDuration: "32s" }}
        >
          {useLogos
            ? // Height-locked, width-natural: every logo renders at the
              // same visual height across the row. We use Next's <Image>
              // so the source 4000×2262 PNGs get downscaled to the actual
              // ~80px display height. No `priority`: it was emitting 14
              // <link rel=preload> with full srcsets in the <head>,
              // competing with the hero for first-paint bandwidth — the
              // marquee sits below the fold, plain lazy loading is right.
              logoBlock!.map((logo, i) => (
                <Image
                  key={`${logo.id}-${i}`}
                  src={logo.url}
                  alt={logo.name}
                  width={320}
                  height={80}
                  sizes="(min-width: 768px) 160px, 120px"
                  quality={80}
                  loading="lazy"
                  unoptimized={false}
                  className="h-14 w-auto min-w-[120px] max-w-[280px] shrink-0 object-contain opacity-80 transition-opacity hover:opacity-100 md:h-16 md:min-w-[140px] md:max-w-[320px]"
                />
              ))
            : wordBlock!.map((c, i) => (
                <span
                  key={i}
                  className="shrink-0 font-display text-2xl tracking-[0.22em] text-[color:var(--color-espresso)]/55 md:text-3xl"
                >
                  {c}
                </span>
              ))}
        </div>
      </div>
    </section>
  );
}
