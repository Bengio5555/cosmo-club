"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/track";
import { recordCanTry } from "@/app/(site)/canettes-personnalisees/actions";
import { personnalisation, recettes, type Recette } from "@/lib/content/canettes";
import { cn } from "@/lib/utils";

/**
 * « Votre marque, dans la main de chaque invité » — la section
 * personnalisation de la page canettes, en une seule pièce :
 *
 *  - la canette qui tourne (clips alpha, servis depuis /public), sur
 *    laquelle le nom saisi vient se poser à la frappe, sans bouton ;
 *  - le formulaire (marque, sous-titre, recette, encre) ;
 *  - les trois points de personnalisation, en bas.
 *
 * Mobile : la canette reste collée sous le header pendant que le
 * formulaire défile en dessous, pour qu'on la voie changer en tapant.
 * Desktop : formulaire à gauche, canette à droite, points en rangée.
 *
 * Aperçu de personnalisation uniquement : pas de prix, pas de commande.
 */

export type CanClip = { webm: string; mov: string; poster: string };

export function CanSticker({ clips }: { clips: Record<Recette["id"], CanClip> }) {
  const [recipe, setRecipe] = useState<Recette["id"]>("framboise-hibiscus");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [ink, setInk] = useState<"noir" | "blanc">("blanc");
  const videoRef = useRef<HTMLVideoElement>(null);
  const brandRef = useRef<HTMLInputElement>(null);
  const lastTracked = useRef("");

  // Identifiant de session anonyme (navigateur, onglet), pour dédoublonner
  // les essais côté base sans rien savoir du visiteur.
  const sessionId = useRef("");
  useEffect(() => {
    try {
      let id = sessionStorage.getItem("cc_can_session");
      if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem("cc_can_session", id);
      }
      sessionId.current = id;
    } catch {
      sessionId.current = `s-${Math.random().toString(36).slice(2, 12)}`;
    }
  }, []);

  // Arrivée par le bouton du hero (#personnalisation) : le champ marque est
  // déjà actif, le visiteur n'a plus qu'à taper.
  useEffect(() => {
    const focusIfTargeted = () => {
      if (window.location.hash === "#personnalisation") {
        setTimeout(() => brandRef.current?.focus({ preventScroll: true }), 700);
      }
    };
    focusIfTargeted();
    window.addEventListener("hashchange", focusIfTargeted);
    return () => window.removeEventListener("hashchange", focusIfTargeted);
  }, []);

  // Demo lettering: the can is never blank. Until the visitor types, it
  // carries the same text the empty fields show as placeholders, so the
  // invitation is obvious and there is nothing to erase first.
  const DEMO_BRAND = "Cosmo Club Paris";
  const DEMO_SUB = "Paris";
  const typed = company.trim();
  const brand = (typed || DEMO_BRAND).slice(0, 24);
  const sub = (name.trim() || DEMO_SUB).slice(0, 24);
  const clip = clips[recipe];
  const current = recettes.find((r) => r.id === recipe)!;

  // Keep the loop playing even when the browser pauses autoplay.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.2 });
    io.observe(v);
    return () => io.disconnect();
  }, [recipe]);

  // One analytics event per brand typed, fired when the visitor pauses ;
  // the brand itself goes to our own base (anonymous), never to GA4.
  useEffect(() => {
    if (typed.length < 3 || typed === lastTracked.current) return;
    const t = setTimeout(() => {
      lastTracked.current = typed;
      track("can_sticker_applied", { ink, recipe, has_brand: "oui" });
      void recordCanTry({ brand: typed, subtitle: name.trim(), recipe, ink, sessionId: sessionId.current });
    }, 800);
    return () => clearTimeout(t);
  }, [typed, name, ink, recipe]);

  const inputClass =
    "mt-2 w-full border-b border-[color:var(--color-espresso)]/30 bg-transparent py-2 font-display text-xl text-[color:var(--color-ink-text)] outline-none transition-colors placeholder:text-[color:var(--color-espresso)]/35 focus:border-[color:var(--color-grenat)]";
  const chipClass = (on: boolean) =>
    cn(
      "inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm transition-colors",
      on
        ? "border-[color:var(--color-grenat)] bg-[color:var(--color-cream)] text-[color:var(--color-ink-text)]"
        : "border-[color:var(--color-espresso)]/25 text-[color:var(--color-espresso)]/80 hover:border-[color:var(--color-or)]",
    );

  return (
    <section id="personnalisation" className="relative scroll-mt-16 bg-[color:var(--color-cream-paper)] py-16 md:py-24">
      <style>{`
        @keyframes sticker-land { 0% { opacity: 0; transform: translate(-50%, -50%) scale(1.5); filter: blur(4px); } 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); filter: blur(0); } }
        .sticker-land { animation: sticker-land 0.6s cubic-bezier(0.19, 1, 0.22, 1) both; }
        @keyframes brand-glow { 0%, 100% { border-color: rgba(139,26,26,0.35); } 50% { border-color: rgba(139,26,26,1); } }
        .brand-glow { animation: brand-glow 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .sticker-land { animation: none; transform: translate(-50%, -50%); } .brand-glow { animation: none; border-color: rgba(139,26,26,0.7); } }
      `}</style>

      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        {/* Mobile : titre, canette collante, formulaire. Desktop : titre et
            formulaire à gauche, canette à droite sur les deux rangées. */}
        <div className="flex flex-col md:grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:grid-rows-[auto_auto] md:items-center md:gap-x-16">
          <div className="order-1 mb-8 max-w-2xl md:order-none md:col-start-1 md:row-start-1 md:mb-10">
            <p className="eyebrow mb-5"><span className="rule" />Personnalisation</p>
            <h2 className="font-display text-balance text-4xl leading-[0.95] text-[color:var(--color-ink-text)] sm:text-5xl md:text-5xl">
              Votre marque,<br />
              <span className="font-accent text-[color:var(--color-grenat)]">dans la main de chaque invité.</span>
            </h2>
            <p className="mt-5 max-w-lg text-[color:var(--color-espresso)]/70">
              Remplacez le nom de démo par votre marque, choisissez la recette et l’encre : elle se pose sur la canette.
            </p>
          </div>

          {/* ── La canette ── */}
          <div className="sticky top-16 z-20 order-2 -mx-6 bg-[color:var(--color-cream-paper)] px-6 pb-4 md:static md:order-none md:col-start-2 md:row-span-2 md:row-start-1 md:mx-0 md:bg-transparent md:px-0 md:pb-0">
            {/* Toucher la canette met le curseur dans le champ marque. */}
            <div
              className="relative mx-auto w-full max-w-[200px] cursor-text md:max-w-[320px]"
              onClick={() => brandRef.current?.focus()}
              role="presentation"
            >
              {/* The clips carry an alpha channel: the can floats directly on
                  the page background. HEVC+alpha for Safari first, VP9+alpha
                  for the others. The can only fills the middle of the 640×864
                  frame (x 33–68 %, y 35–79 %), so the frame is cropped to
                  x 20–80 % / y 28–86 % to avoid dead space around it. */}
              <div className="relative aspect-[384/501] w-full overflow-hidden">
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-[12%] left-1/2 h-[5%] w-[73%] -translate-x-1/2 rounded-[100%] bg-[#2a1f14] opacity-25 blur-lg"
                />
                <video
                  key={clip.webm}
                  ref={videoRef}
                  poster={clip.poster}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  className="absolute left-[-33.33%] top-[-48.3%] w-[166.67%] max-w-none"
                  aria-label={`Canette ${current.name} en rotation`}
                >
                  <source src={clip.mov} type='video/mp4; codecs="hvc1"' />
                  <source src={clip.webm} type="video/webm" />
                </video>

                <div
                    key={`${recipe}-${ink}`}
                    className="sticker-land pointer-events-none absolute left-1/2 top-[50%] flex w-[55%] flex-col items-center text-center"
                    style={{
                      containerType: "inline-size",
                      color: ink === "blanc" ? "#ffffff" : "#1a120c",
                      textShadow: ink === "blanc" ? "0 0 1px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)" : "0 0 1px rgba(255,255,255,0.4)",
                    }}
                    aria-live="polite"
                    data-demo={typed ? undefined : "true"}
                  >
                    {/* sizes in container-query units so the lettering always fits the can body */}
                    <span className="font-body font-semibold uppercase leading-[1.15] tracking-[0.22em]" style={{ fontSize: "9.5cqw" }}>{brand}</span>
                    <span className="mt-[4cqw] font-body uppercase tracking-[0.3em] opacity-85" style={{ fontSize: "5.5cqw" }}>{sub}</span>
                </div>
              </div>
              <p className="mt-3 text-center text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/55">
                {typed ? (
                  <span className="hidden md:inline">{current.name} · {current.garnishShort.toLowerCase()}</span>
                ) : (
                  <span className="text-[color:var(--color-grenat)]">Tapez votre marque</span>
                )}
              </p>
            </div>
          </div>

          {/* ── Le formulaire ── */}
          <form
            className="order-3 space-y-6 md:order-none md:col-start-1 md:row-start-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-grenat)]">Essayez avec votre marque</span>
                <input
                  ref={brandRef}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  maxLength={24}
                  placeholder={DEMO_BRAND}
                  autoComplete="organization"
                  className={cn(inputClass, "text-2xl md:text-3xl", !typed && "brand-glow border-b-2")}
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">Sous-titre</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={24}
                  placeholder={DEMO_SUB}
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
            </div>

            <fieldset>
              <legend className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">La recette</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {recettes.map((r) => (
                  <button key={r.id} type="button" onClick={() => setRecipe(r.id)} aria-pressed={recipe === r.id} className={chipClass(recipe === r.id)}>
                    {r.name}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-espresso)]/70">L’encre</legend>
              <div className="mt-3 flex flex-wrap gap-3">
                {(["blanc", "noir"] as const).map((x) => (
                  <button key={x} type="button" onClick={() => setInk(x)} aria-pressed={ink === x} className={cn(chipClass(ink === x), "capitalize")}>
                    <span aria-hidden className="h-4 w-4 rounded-full border border-black/15" style={{ background: x === "blanc" ? "#ffffff" : "#1a120c" }} />
                    {x}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="pt-2">
              <Link
                href={typed ? `/contact?marque=${encodeURIComponent(typed)}` : "/contact"}
                onClick={() => track("devis_cta_click", { location: "can_sticker" })}
                className="inline-flex items-center gap-3 py-2 text-[11px] font-bold uppercase tracking-[0.32em] text-[color:var(--color-ink-text)] transition-colors hover:text-[color:var(--color-grenat)]"
              >
                <span className="h-[1px] w-6 bg-current" />
                {typed ? `Demander un devis pour ${brand}` : "Demander un devis"}
              </Link>
              <p className="mt-3 text-[11px] leading-relaxed text-[color:var(--color-espresso)]/55">
                Aperçu indicatif. Sur la vraie canette, votre logo est posé en étiquette transparente ; le visuel définitif est réalisé par nos soins et validé avec vous avant production.
              </p>
            </div>
          </form>
        </div>

        {/* ── Les trois points, après l'essai ── */}
        <div className="mt-14 grid gap-8 border-t border-[color:var(--color-ash)]/60 pt-10 md:mt-20 md:grid-cols-3 md:gap-10 md:pt-12">
          {personnalisation.map((item, i) => (
            <div key={item.title} className="flex gap-5">
              <span className="font-display text-3xl leading-none text-[color:var(--color-or)]/80 md:text-4xl">0{i + 1}</span>
              <div>
                <h3 className="font-display text-xl text-[color:var(--color-ink-text)] md:text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-espresso)]/80">{item.desc}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-grenat)]">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
