import { Reveal } from "@/components/motion/Reveal";
import { TrackedNextLink } from "@/components/analytics/TrackedNextLink";
import { formules, paliers, options, formatEur, ttc } from "@/lib/content/canettes";

export function FormulesSection() {
  return (
    <section id="formules" className="relative bg-[color:var(--color-cream-paper)] py-20 md:py-28">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <Reveal className="mb-16 flex flex-col md:mb-24 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow mb-6"><span className="rule" />Les formules</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-6xl">
              Livrée, installée<br />
              <span className="font-accent text-[color:var(--color-grenat)]">
                ou servie en direct.
              </span>
            </h2>
          </div>
          <p className="mt-6 max-w-sm text-[color:var(--color-espresso)]/70 md:mt-0">
            Une autre façon de travailler avec Cosmo Club : pour changer de format, ou pour un événement au budget plus serré qu’un bar à cocktails avec son équipe. Dès 200 canettes, prix d’appel HT, chaque projet fait l’objet d’un devis.
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-3">
          {formules.map((f, i) => (
            <Reveal
              key={f.id}
              delay={i * 140}
              className="group relative flex flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)] p-6 transition-colors duration-700 hover:border-[color:var(--color-or)]/50 md:row-span-8 md:grid md:grid-rows-subgrid md:gap-y-0 md:p-8"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[3px]"
                style={{
                  background:
                    i === 0
                      ? "linear-gradient(90deg, transparent, rgba(233,226,208,0.5), transparent)"
                      : i === 1
                      ? "linear-gradient(90deg, transparent, rgba(201,169,97,0.7), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(181,50,43,0.7), transparent)",
                }}
              />

              {/* Eight subgrid rows shared by the three cards (eyebrow, title,
                  tagline, description, price, includes, audiences, CTA): every
                  line and every separator sits at the same height whatever
                  the text length. */}
              <div className="flex items-baseline justify-between">
                <p className="eyebrow whitespace-nowrap">{f.num} · Dès {f.minCans} canettes</p>
                {f.highlight && (
                  <span className="shrink-0 font-display text-xs capitalize tracking-[0.3em] text-[color:var(--color-espresso)]/40">
                    {f.highlight}
                  </span>
                )}
              </div>

              <h3 className="mt-3 font-display text-4xl text-[color:var(--color-ink-text)] md:text-4xl">
                {f.name}
              </h3>
              <p className="mt-2 font-accent text-lg text-[color:var(--color-grenat)]">{f.tagline}</p>

              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--color-espresso)]/80">
                {f.desc}
              </p>

              <div className="mt-6 border-t border-[color:var(--color-ash)]/60 pt-5">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/60">
                  À partir de
                </p>
                <p className="mt-1 font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
                  {formatEur(f.fromHt)} € <span className="text-base text-[color:var(--color-espresso)]/60">HT</span>
                  {f.fromUnit === "canette" && (
                    <span className="text-base text-[color:var(--color-espresso)]/60"> la canette</span>
                  )}
                </p>
                {f.priceNote && (
                  <p className="mt-1 text-xs text-[color:var(--color-espresso)]/65">{f.priceNote}</p>
                )}
              </div>

              <ul className="mt-6 space-y-2 border-t border-[color:var(--color-ash)]/60 pt-4 text-sm">
                {f.includes.map((inc) => (
                  <li key={inc} className="flex items-start gap-3 text-[color:var(--color-espresso)]/80">
                    <span className="mt-2 h-[4px] w-[4px] shrink-0 rounded-full bg-[color:var(--color-or)]" />
                    {inc}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-[color:var(--color-espresso)]/55">
                {f.forWho.join(" · ")}
              </p>

              <TrackedNextLink
                event="devis_cta_click"
                location={`formule_${f.id}`}
                href="/contact"
                className="mt-auto inline-flex items-center gap-3 self-start pt-8 text-[11px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
              >
                <span className="h-[1px] w-6 bg-current" />
                Demander un devis
              </TrackedNextLink>
            </Reveal>
          ))}
        </div>

        {/* Dégressif + options */}
        <div className="mt-16 grid gap-10 md:mt-24 md:grid-cols-2 md:gap-16">
          <Reveal>
            <p className="eyebrow mb-6"><span className="rule" />Le prix de la canette</p>
            <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
              Dégressif <span className="font-accent text-[color:var(--color-grenat)]">dès 500.</span>
            </h3>
            <dl className="mt-8 divide-y divide-[color:var(--color-ash)]/60 border-y border-[color:var(--color-ash)]/60">
              {paliers.map((p) => (
                <div key={p.range} className="flex items-baseline justify-between gap-6 py-4">
                  <dt className="text-[15px] text-[color:var(--color-espresso)]/80">{p.range}</dt>
                  <dd className="text-right">
                    <span className="font-display text-2xl tabular-nums text-[color:var(--color-ink-text)]">
                      {formatEur(p.ht)} € <span className="text-sm text-[color:var(--color-espresso)]/60">HT</span>
                    </span>
                    <span className="block text-xs text-[color:var(--color-espresso)]/55">{formatEur(ttc(p.ht))} € TTC</span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs leading-relaxed text-[color:var(--color-espresso)]/65">
              Formules Livrée et Installée, 200 canettes minimum. Création du visuel offerte. TTC indiqué pour les particuliers, TVA 20 %.
            </p>
          </Reveal>

          <Reveal delay={140}>
            <p className="eyebrow mb-6"><span className="rule" />Les options</p>
            <h3 className="font-display text-3xl text-[color:var(--color-ink-text)] md:text-4xl">
              Pour aller <span className="font-accent text-[color:var(--color-grenat)]">plus loin.</span>
            </h3>
            <ul className="mt-8 divide-y divide-[color:var(--color-ash)]/60 border-y border-[color:var(--color-ash)]/60">
              {options.map((o) => (
                <li key={o.name} className="py-4">
                  <div className="flex items-baseline justify-between gap-6">
                    <p className="font-display text-xl text-[color:var(--color-ink-text)]">{o.name}</p>
                    <p className="shrink-0 text-sm tabular-nums text-[color:var(--color-grenat)]">{o.price}</p>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[color:var(--color-espresso)]/75">{o.desc}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
