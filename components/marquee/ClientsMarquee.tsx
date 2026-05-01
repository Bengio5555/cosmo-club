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
  const logoBlock = useLogos ? [...logos, ...logos] : null;
  const wordBlock = !useLogos
    ? [
        ...FALLBACK_CLIENTS.map((c) => c.toUpperCase()),
        ...FALLBACK_CLIENTS.map((c) => c.toUpperCase()),
      ]
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
        <div className="marquee-track items-center gap-16 md:gap-24">
          {useLogos
            ? // Same height, free width: object-contain keeps each
              // logo's aspect ratio while normalising vertical scale.
              logoBlock!.map((logo, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={`${logo.id}-${i}`}
                  src={logo.url}
                  alt={logo.name}
                  loading="lazy"
                  className="h-12 w-auto max-w-[180px] shrink-0 object-contain opacity-80 transition-opacity hover:opacity-100"
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
