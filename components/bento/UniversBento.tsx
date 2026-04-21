import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";
import bentoBarImg from "@/public/brand/ai/bento-bar.png";
import bentoBaristaImg from "@/public/brand/ai/bento-barista.png";

export function UniversBento() {
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
              Deux univers, une signature
            </p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-7xl">
              Le verre, <span className="font-accent italic text-[color:var(--color-grenat)]">ou la tasse.</span>
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
            visual={<CocktailVisual />}
          />

          {/* Barista */}
          <BentoCard
            href="/barista"
            className="md:row-span-1 md:min-h-[310px]"
            index="02"
            kicker="Offre signature"
            title="Barista"
            description="Matcha · Ube · Blue · Golden Latte. Un bar instagrammable, chaud ou glacé."
            visual={<LatteVisual />}
          />

          {/* Personnalisation teaser */}
          <BentoCard
            href="#personnalisation"
            className="md:row-span-1 md:min-h-[310px]"
            index="03"
            kicker="Sur-mesure"
            title="Votre identité partout"
            description="Glaçons, pochoirs, toppings, mélangeurs, gobelets — tout peut porter votre signature."
            visual={<MonogramVisual />}
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
}: {
  href: string;
  className?: string;
  index: string;
  kicker: string;
  title: string;
  description: string;
  visual: React.ReactNode;
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
        style={{
          background:
            "linear-gradient(to top, rgba(237,227,201,0.92) 0%, rgba(237,227,201,0.5) 40%, transparent 80%)",
        }}
      />

      <div className="flex items-start justify-between gap-6">
        <span className="eyebrow text-[color:var(--color-or)]">{kicker}</span>
        <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-espresso)]/50">
          {index}
        </span>
      </div>

      <div className="mt-auto">
        <h3 className="font-display text-4xl leading-[0.95] text-[color:var(--color-ink-text)] md:text-6xl">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[color:var(--color-espresso)]/75">
          {description}
        </p>
        <span className="mt-8 inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-or)] transition-all duration-500 group-hover:gap-5">
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

function CocktailVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={bentoBarImg}
        alt=""
        fill
        sizes="(min-width: 768px) 66vw, 100vw"
        className="object-cover object-center transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.05]"
        priority
      />
    </div>
  );
}

function LatteVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={bentoBaristaImg}
        alt=""
        fill
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover object-center transition-transform duration-[1.4s] ease-[var(--ease-silk)] group-hover:scale-[1.05]"
      />
    </div>
  );
}

function MonogramVisual() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 70% 50%, rgba(201,169,97,0.35), transparent 55%), linear-gradient(150deg, var(--color-cream-pearl), var(--color-cream-warm))",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-[8rem] font-light leading-none tracking-[-0.04em] text-[color:var(--color-or-deep)]/25">
          CC
        </span>
      </div>
    </div>
  );
}
