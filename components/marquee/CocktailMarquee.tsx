const cocktails = [
  "Cosmopolitan",
  "Margarita",
  "Moscow Mule",
  "Pornstar Martini",
  "Espresso Martini",
  "Basil Smash",
  "Spicy Margarita",
  "Amaretto Sour",
  "Old Fashioned",
  "Negroni",
  "And More",
];

export function CocktailMarquee() {
  const line = cocktails.map((c) => c.toUpperCase());
  const block = [...line, ...line]; // duplicated for infinite scroll
  return (
    <section
      aria-label="Carte des cocktails"
      className="marquee edge-fade-x relative overflow-hidden border-t border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream-warm)] py-3 md:py-4"
    >
      <div className="marquee-track gap-10 md:gap-14">
        {block.map((item, i) => (
          <span key={i} className="flex shrink-0 items-center gap-10 md:gap-14">
            <span className="font-display text-[3.5vw] leading-none uppercase tracking-[0.04em] text-[color:var(--color-ink-text)] md:text-[2.6vw]">
              {item}
            </span>
            <span aria-hidden className="inline-block h-[6px] w-[6px] shrink-0 rounded-full border border-[color:var(--color-grenat)]">
              <span className="block h-full w-full scale-[0.5] rounded-full bg-[color:var(--color-grenat)]" />
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
