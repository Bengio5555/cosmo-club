import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * « Votre logo » : une canette vide et transparente posée sur un fond de
 * texte répété, le lettrage venant se poser au centre du corps. Tout est
 * composé ici (texte CSS, typographies du site), seule la canette est une
 * photo détourée : /brand/canettes/can-empty.png (695 × 1600, alpha).
 *
 * Le PNG porte une transparence partielle dans le corps de la canette :
 * le fond et le texte se devinent au travers, comme à travers du PET.
 *
 * Deux usages : carte portrait 3/4 (par défaut, avec le texte répété), ou
 * `fill` pour couvrir un conteneur positionné (tuile de l'accueil) : la
 * canette seule, calée à droite sous la ligne d'en-tête, sans texte
 * derrière pour laisser le titre de la tuile lisible.
 */
const ROWS = 13;

export function LogoCanVisual({ className = "", fill = false }: { className?: string; fill?: boolean }) {
  return (
    <div
      aria-label="Canette transparente avec la mention Votre logo"
      role="img"
      className={cn(
        "isolate overflow-hidden bg-[color:var(--color-cream-paper)]",
        fill ? "absolute inset-0" : "relative aspect-[3/4] w-full rounded-[var(--radius-xl)]",
        className,
      )}
      style={{ containerType: "inline-size" }}
    >
      {fill ? (
        /* tile : no lettering behind the card's own text, just a warm halo
           behind the can */
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 38% 55% at 78% 55%, rgba(201,169,97,0.28), transparent 70%)" }}
        />
      ) : (
        /* card : repeated lettering, fading toward the right like a print proof */
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex flex-col justify-center overflow-hidden select-none"
          style={{
            maskImage: "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.2) 100%)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.2) 100%)",
          }}
        >
          {Array.from({ length: ROWS }, (_, i) => (
            <p
              key={i}
              className="whitespace-nowrap font-display font-medium uppercase leading-[1.02] text-[color:var(--color-grenat)]/85"
              style={{ fontSize: "8.6cqw", letterSpacing: "0.02em", marginLeft: `${-4 - (i % 2) * 9}cqw` }}
            >
              Canettes personnalisées
            </p>
          ))}
        </div>
      )}

      {/* the can with its soft floor reflection ; the lettering is centred
          on the can itself (container = the can's own box) */}
      <div className={cn("absolute inset-x-0 flex items-end", fill ? "bottom-[10%] top-[22%] justify-end pr-[6%] md:bottom-[8%] md:top-[20%] md:pr-[7%]" : "bottom-[6%] top-[9%] justify-center")}>
        {/* explicit aspect ratio: inline-size containment would otherwise
            collapse this box to zero width */}
        <div className="relative aspect-[695/1600] h-full" style={{ containerType: "inline-size" }}>
          <Image
            src="/brand/canettes/can-empty.png"
            alt=""
            width={695}
            height={1600}
            sizes="(min-width: 768px) 20vw, 50vw"
            className="h-full w-full drop-shadow-[0_30px_40px_rgba(42,31,20,0.22)]"
          />
          <div
            className="pointer-events-none absolute left-1/2 top-[50%] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center text-[#1a120c]"
            style={{ textShadow: "0 0 1px rgba(255,255,255,0.5)" }}
          >
            <span className="font-body font-semibold uppercase leading-[1.15] tracking-[0.3em]" style={{ fontSize: "10.5cqw" }}>Votre</span>
            <span className="font-body font-semibold uppercase leading-[1.15] tracking-[0.3em]" style={{ fontSize: "10.5cqw" }}>Logo</span>
            <span className="mt-[5cqw] font-body uppercase tracking-[0.34em] opacity-80" style={{ fontSize: "5.3cqw" }}>Paris</span>
          </div>
        </div>
      </div>
    </div>
  );
}
