"use client";

import { Reveal } from "@/components/motion/Reveal";

// Each tile is anchored to a stable slot key that matches the admin's
// `personnalisation` page in images-config.json. Uploading an image in the
// admin while that slot is selected replaces the tile's backgroundImage.
// The num / text copy stays hard-coded as positional decoration.
// Image URLs are resolved server-side in app/(site)/page.tsx and passed
// in via the `paths` prop — used to be a useImageConfig() client hook,
// which caused the static fallback PNG to flash before being swapped
// for the admin-uploaded image once the hook fetched the config.
type Tuile = {
  key: string;
  num: string;
  title: string;
  text: string;
};

const TUILES: Tuile[] = [
  {
    key: "glacons",
    num: "01",
    title: "Glaçons",
    text: "Logo, fleurs comestibles, fruits ou or fin — gravés dans la glace.",
  },
  {
    key: "pastilles",
    num: "02",
    title: "Pastilles",
    text: "Des disques comestibles qui flottent à la surface — logo ou motif.",
  },
  {
    key: "toppings-fruit",
    num: "03",
    title: "Toppings fruit",
    text: "Fruits frais sculptés aux initiales ou aux lettres de votre marque.",
  },
  {
    key: "pochoirs",
    num: "04",
    title: "Pochoirs",
    text: "Sur la mousse des lattes, saupoudré au cacao ou au curcuma.",
  },
  {
    key: "melangeurs",
    num: "05",
    title: "Mélangeurs",
    text: "Stirrers personnalisés — bois, cristal, laiton, porte vos lettres.",
  },
  {
    key: "dessous-de-verre",
    num: "06",
    title: "Dessous de verre",
    text: "Feutre, liège, marbre — votre motif, votre matière, votre touche.",
  },
];

export function Personnalisation({ paths }: { paths: Record<string, string> }) {
  const tuiles = TUILES.map((t) => ({
    ...t,
    backgroundImage: `url(${paths[t.key] ?? ""})`,
  }));
  return _Section(tuiles);
}

function _Section(tuiles: (Tuile & { backgroundImage: string })[]) {
  return (
    <section
      id="personnalisation"
      className="relative overflow-hidden bg-[color:var(--color-cream-pearl)] py-20 text-[color:var(--color-ink-text)] md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 85% 15%, rgba(201,169,97,0.18), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(139,26,26,0.06), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-12 flex flex-col md:mb-16 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-6 text-[11px] uppercase tracking-[0.32em] font-medium text-[color:var(--color-grenat)]">
              <span className="mr-3 inline-block h-px w-12 align-middle bg-[color:var(--color-grenat)] opacity-70" />
              Votre signature, partout
            </p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] [hyphens:auto] sm:text-5xl md:text-7xl">
              La personnalisation,{" "}
              <span className="font-accent italic text-[color:var(--color-grenat)]">
                portée à l'extrême.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Chaque détail peut porter votre marque. Six terrains de jeu pour inscrire votre logo, vos couleurs, vos initiales.
          </p>
        </Reveal>
      </div>

      <div
        role="list"
        aria-label="Options de personnalisation"
        className="relative grid grid-cols-2 gap-5 px-6 md:grid-cols-3 md:gap-6 md:px-10"
      >
        {tuiles.map((t) => (
          <article
            key={t.num}
            role="listitem"
            className="group relative flex h-[280px] flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream)] p-5 text-[color:var(--color-ink-text)] shadow-sm transition-all duration-700 ease-[var(--ease-silk)] hover:-translate-y-2 hover:border-[color:var(--color-or-deep)] hover:shadow-md md:p-6"
            style={{
              backgroundImage: t.backgroundImage,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="flex items-start">
              <span className="font-display text-xs tracking-[0.3em] text-[color:var(--color-grenat)]">
                {t.num}
              </span>
            </div>
            <div>
              <h3 className="font-display text-xl md:text-2xl text-[color:var(--color-ink-text)]">
                {t.title}
              </h3>
              <p className="mt-2 text-xs md:text-sm leading-relaxed text-[color:var(--color-espresso)]/75">
                {t.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
