import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";

const ITEMS = [
  {
    href: "/bar-a-cocktails/mariage",
    label: "Mariage",
    desc: "Bar à cocktails pour votre mariage : carte signature, scénographie sur mesure, mocktails élégants.",
  },
  {
    href: "/bar-a-cocktails/anniversaire",
    label: "Anniversaire",
    desc: "30, 40, 50 ans et plus : un anniversaire qui marque, à domicile ou dans une salle privée.",
  },
  {
    href: "/bar-a-cocktails/entreprise",
    label: "Entreprise",
    desc: "Cocktails corporate, lancements de marque, séminaires, cocktails de fin d'année — brandés à vos couleurs.",
  },
  {
    href: "/barman-prive-paris",
    label: "Barman privé",
    desc: "Un mixologue à domicile pour un dîner, une soirée intime, un événement familial.",
  },
  {
    href: "/animation-cocktail-paris",
    label: "Atelier mixologie",
    desc: "Atelier cocktail à domicile ou en entreprise : EVJF, EVG, team building.",
  },
] as const;

/**
 * Hub block linking the five intent-specific landing pages from the
 * main /bar-a-cocktails page. Helps Google crawl the sub-pages and
 * passes link equity from the high-traffic parent.
 */
export function IntentLinks() {
  return (
    <section className="bg-[color:var(--color-cream-paper)] py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal>
          <p className="eyebrow mb-6"><span className="rule" />Pour quel événement ?</p>
          <h2 className="font-display text-[7vw] leading-[1] text-balance text-[color:var(--color-ink-text)] md:text-[3.5vw]">
            Cinq formats, une <span className="font-accent italic text-[color:var(--color-grenat)]">même exigence</span>.
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item) => (
            <Reveal key={item.href}>
              <Link
                href={item.href}
                className="group block h-full border-l-2 border-[color:var(--color-grenat)]/40 bg-[color:var(--color-cream)] p-7 transition-colors hover:border-[color:var(--color-grenat)] hover:bg-[color:var(--color-cream-dark)]"
              >
                <h3 className="font-display text-2xl text-[color:var(--color-ink-text)] transition-colors group-hover:text-[color:var(--color-grenat)]">
                  {item.label}
                </h3>
                <p className="mt-3 leading-relaxed text-[color:var(--color-espresso)]/80">
                  {item.desc}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-grenat)]">
                  Découvrir <span className="h-px w-6 bg-current transition-all group-hover:w-10" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <p className="mt-12 text-sm leading-relaxed text-[color:var(--color-espresso)]/80">
            Vous hésitez encore entre location de bar, barman à domicile et
            prestation clé en main ?{" "}
            <Link
              href="/blog/bar-cocktails-evenementiel-paris-guide-choisir-formule"
              className="text-[color:var(--color-grenat)] underline underline-offset-4 transition-colors hover:text-[color:var(--color-grenat-glow)]"
            >
              Lire le guide complet du bar à cocktails événementiel à Paris
            </Link>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
