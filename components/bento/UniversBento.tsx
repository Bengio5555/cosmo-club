"use client";

import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import { LogoCanVisual } from "@/components/canettes/LogoCanVisual";

// SSR-resolved image URLs are passed in via the `paths` prop. We used
// to read them through useImageConfig (a client hook), which painted
// the static fallback before swapping to the admin upload on hydration
// — a visible flash. The parent HomePage now resolves both URLs in
// its server render and hands them down.
export function UniversBento({
  paths,
}: {
  paths: { bar: string; barista: string };
}) {

  return (
    <section
      id="univers"
      className="relative bg-[color:var(--color-cream)] py-20 text-[color:var(--color-ink-text)] md:py-28"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-14 flex flex-col md:mb-20 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-6 text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
              <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-grenat)] opacity-70" />
              Trois univers, une signature
            </p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Le verre, <span className="font-accent text-[color:var(--color-grenat)]">ou la tasse.</span>
              <br />
              L'un comme l'autre, <br className="hidden md:block" />
              pensés comme une œuvre.
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Chaque univers s'adapte à votre événement — d'un cocktail préparé à la minute aux lattes d'exception servies en stand sur-mesure.
          </p>
        </Reveal>

        <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2 md:gap-6">
          {/* Bar à cocktails — large */}
          <BentoCard
            href="/bar-a-cocktails"
            className="md:col-span-2 md:row-span-2 md:min-h-[640px]"
            index="01"
            kicker="Offre signature"
            title="Bar à cocktails"
            description="Cocktails, shots, champagne, bouteilles « in a bottle » et créations sur-mesure signées par nos mixologistes."
            visual={<CocktailVisual src={paths.bar} priority />}
          />

          {/* Barista */}
          <BentoCard
            href="/barista"
            className="md:row-span-1 md:min-h-[310px]"
            index="02"
            kicker="Offre signature"
            title="Barista"
            description={
              <>
                Matcha · Ube · Blue · Golden Latte.
                <br />
                Un bar chaud ou glacé.
              </>
            }
            visual={<LatteVisual src={paths.barista} />}
          />

          {/* Mocktail in a can — nouvelle offre */}
          <BentoCard
            href="/canettes-personnalisees"
            className="md:row-span-1 md:min-h-[310px]"
            index="03"
            kicker="Nouveau"
            title="Mocktail in a can"
            titleClassName="max-w-[9ch] text-4xl md:text-[2.6rem]"
            overlay="linear-gradient(to right, rgba(237,227,201,0.55) 0%, rgba(237,227,201,0.25) 45%, transparent 65%)"
            description={<span className="block max-w-[19ch]">Des recettes sans alcool, votre logo. Dès 200 canettes.</span>}
            visual={<LogoCanVisual fill />}
          />
        </div>
      </div>
    </section>
  );
}

function BentoCard({
  href,
  className = "",
  index,
  kicker,
  title,
  description,
  visual,
  titleClassName = "text-4xl md:text-6xl",
  overlay = "linear-gradient(to top, rgba(237,227,201,0.92) 0%, rgba(237,227,201,0.5) 40%, transparent 80%)",
}: {
  href: string;
  className?: string;
  index: string;
  kicker: string;
  title: string;
  description: React.ReactNode;
  visual: React.ReactNode;
  /** Override for long titles that must not wrap on three lines in a 1/3 card. */
  titleClassName?: string;
  /** Cream wash over the visual; lighter when the photo itself is the message. */
  overlay?: string;
}) {
  return (
    <Link
      href={href}
      className={`group relative isolate flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ink)]/10 bg-[color:var(--color-cream)] p-8 transition-all duration-700 ease-[var(--ease-silk)] hover:border-[color:var(--color-or)]/70 md:p-10 ${className}`}
    >
      <div className="absolute inset-0 -z-10 transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.02]">
        {visual}
      </div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: overlay }}
      />

      <div className="flex items-start justify-between gap-6">
        <span className="eyebrow">{kicker}</span>
        <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-espresso)]/50">
          {index}
        </span>
      </div>

      <div className="mt-auto">
        <h3 className={`font-display text-balance leading-[0.95] text-[color:var(--color-ink-text)] ${titleClassName}`}>
          {title}
        </h3>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[color:var(--color-espresso)]/75">
          {description}
        </p>
        <span className="mt-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-grenat)] transition-all duration-500 group-hover:gap-5 group-hover:text-[color:var(--color-grenat-glow)]">
          Découvrir
          <span
            aria-hidden
            className="h-px w-6 bg-current transition-all duration-500 group-hover:w-12"
          />
        </span>
      </div>
    </Link>
  );
}

/* ─── Decorative visuals (CSS/SVG — replace with real photos later) ─── */

function CocktailVisual({ src, priority }: { src: string; priority?: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        key={src}
        src={src}
        alt=""
        fill
        sizes="(min-width: 768px) 66vw, 100vw"
        className="object-cover object-center transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.05]"
        priority={priority}
      />
    </div>
  );
}

function LatteVisual({ src, position = "object-center" }: { src: string; position?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        key={src}
        src={src}
        alt=""
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className={`object-cover ${position} transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.05]`}
      />
    </div>
  );
}
