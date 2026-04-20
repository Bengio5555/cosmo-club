const drinks = [
  "Matcha Latte",
  "Ube Latte",
  "Blue Latte",
  "Golden Latte",
  "Cappuccino",
  "Flat White",
  "Cold Brew",
  "Cortado",
  "Iced Matcha",
  "Chai Latte",
  "Espresso",
  "And More",
];

export function BaristaMarquee() {
  const line = drinks.map((c) => c.toUpperCase());
  const block = [...line, ...line];
  return (
    <section
      aria-label="Carte barista"
      className="marquee edge-fade-x relative overflow-hidden border-b border-[color:var(--color-ash-warm)] bg-[color:var(--color-cream)] py-3 md:py-4"
    >
      <div className="marquee-track marquee-track--reverse gap-10 md:gap-14">
        {block.map((item, i) => (
          <span key={i} className="flex shrink-0 items-center gap-10 md:gap-14">
            <span className="font-display text-[3.5vw] leading-none uppercase tracking-[0.04em] text-[color:var(--color-ink-text)] md:text-[2.6vw]">
              {item}
            </span>
            <span aria-hidden className="inline-block h-[6px] w-[6px] shrink-0 rounded-full border border-[color:var(--color-or-deep)]">
              <span className="block h-full w-full scale-[0.5] rounded-full bg-[color:var(--color-or-deep)]" />
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
