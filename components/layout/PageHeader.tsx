import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow?: string;
  title: string;
  italicWord?: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, italicWord, description }: Props) {
  return (
    <section className="relative overflow-hidden bg-[color:var(--color-cream-paper)] pt-40 pb-24 md:pt-56 md:pb-32">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 50% 50% at 20% 20%, rgba(139,26,26,0.15), transparent 60%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(201,169,97,0.08), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal>
          {eyebrow && (
            <p className="eyebrow mb-6">
              <span className="rule" />{eyebrow}
            </p>
          )}
          <h1 className="font-display text-4xl leading-[0.95] text-balance text-[color:var(--color-ink-text)] [hyphens:auto] sm:text-5xl md:text-6xl lg:text-[8vw]">
            {title}
            {italicWord && (
              <>
                {" "}
                <span className="font-accent italic text-[color:var(--color-grenat)]">
                  {italicWord}
                </span>
              </>
            )}
          </h1>
          {description && (
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[color:var(--color-espresso)]/75 md:text-xl">
              {description}
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
