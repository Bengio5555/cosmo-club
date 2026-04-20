import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/lib/site";

export function CtaDevis() {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream-paper)] py-36 md:py-56">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(139,26,26,0.28), transparent 60%), radial-gradient(ellipse 40% 40% at 80% 20%, rgba(201,169,97,0.12), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 text-center md:px-10">
        <Reveal>
          <p className="eyebrow mb-8 justify-center"><span className="rule" />Prenons rendez-vous</p>
          <h2 className="font-display text-[11vw] leading-[0.95] text-balance text-[color:var(--color-ink-text)] sm:text-[13vw] md:text-[8vw]">
            Parlons de <span className="font-accent italic text-[color:var(--color-grenat)]">votre</span> événement.
          </h2>
          <p className="mx-auto mt-8 max-w-xl text-lg text-[color:var(--color-espresso)]/75 md:text-xl">
            Racontez-nous votre moment — mariage, dîner, défilé, soirée intime. Nous composons une offre sur-mesure, à la hauteur.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/contact"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-[color:var(--color-grenat)] px-10 py-5 text-[12px] uppercase tracking-[0.32em] text-[color:var(--color-bone)] transition-colors duration-500 hover:bg-[color:var(--color-grenat-glow)]"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[color:var(--color-or)]/30 to-transparent transition-transform duration-[1.3s] ease-[var(--ease-silk)] group-hover:translate-x-full" />
              <span className="relative">Demander un devis</span>
              <span className="relative h-px w-8 bg-current transition-all duration-500 group-hover:w-14" />
            </Link>
            <a
              href={`tel:${site.phone}`}
              className="inline-flex items-center gap-3 px-4 py-3 text-[12px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/80 hover:text-[color:var(--color-or)]"
            >
              <span className="h-px w-6 bg-current" />
              {site.phoneDisplay}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
