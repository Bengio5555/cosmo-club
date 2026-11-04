"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { track, EVENTS } from "@/lib/track";
import { cn } from "@/lib/utils";

/**
 * Barre d'appel au devis, discrète, en bas de l'écran. Pas une popup :
 * elle ne couvre pas le contenu, ne bloque rien, se ferme d'un clic.
 *
 * Elle n'apparaît qu'après un signal d'intérêt, le premier atteint :
 *  - la moitié de la page a été parcourue ;
 *  - 45 s de présence active (onglet visible) ;
 *  - deuxième page vue dans la visite, après 15 s.
 *
 * Jamais sur la page devis ni sur les pages légales. Une fois fermée,
 * elle ne revient pas de la visite (sessionStorage). Le message s'adapte
 * à la page : canettes à votre marque sur l'offre canettes, projet d'événement ailleurs.
 */

const HIDDEN_ON = ["/contact", "/cgv", "/mentions-legales", "/politique-de-confidentialite"];
const KEY_DISMISSED = "cosmo-cta-bar";
const KEY_PAGES = "cosmo-pages";
const SCROLL_RATIO = 0.5;
const DELAY_FIRST_PAGE_MS = 45_000;
const DELAY_NEXT_PAGE_MS = 15_000;

function messageFor(pathname: string) {
  if (pathname.startsWith("/canettes-personnalisees")) {
    return {
      title: "Des canettes à votre marque ?",
      sub: "Dès 200 canettes, devis sous 48h, sans engagement.",
      cta: "Demander un devis",
      href: "/contact",
    };
  }
  if (pathname.startsWith("/barista")) {
    return {
      title: "Un bar à café pour votre événement ?",
      sub: "Devis personnalisé sous 48h, sans engagement.",
      cta: "Demander un devis",
      href: "/contact",
    };
  }
  return {
    title: "Un projet d'événement en tête ?",
    sub: "Devis personnalisé sous 48h, sans engagement.",
    cta: "Demander un devis",
    href: "/contact",
  };
}

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // stockage bloqué : la barre se comporte comme une première visite
  }
}

export function FloatingDevisBar() {
  const pathname = usePathname() ?? "/";
  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // true jusqu'à lecture du storage

  // Compte les pages vues dans la visite et lit l'état « fermée ».
  useEffect(() => {
    const pages = Number(readSession(KEY_PAGES) ?? "0") + 1;
    writeSession(KEY_PAGES, String(pages));
    const wasDismissed = readSession(KEY_DISMISSED) === "1";
    queueMicrotask(() => setDismissed(wasDismissed));
  }, [pathname]);

  // Déclencheurs : défilement, temps actif, deuxième page.
  useEffect(() => {
    if (dismissed || hiddenHere || visible) return;

    let active = 0;
    let last = document.visibilityState === "visible" ? performance.now() : null;
    const pages = Number(readSession(KEY_PAGES) ?? "1");
    const delay = pages >= 2 ? DELAY_NEXT_PAGE_MS : DELAY_FIRST_PAGE_MS;
    let shown = false;

    const show = (reason: string) => {
      if (shown) return;
      shown = true;
      setVisible(true);
      track("cta_bar_view", { location: "floating_bar", reason, page: pathname });
    };

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 400 && window.scrollY / max >= SCROLL_RATIO) show("scroll");
    };
    const onVisibility = () => {
      const now = performance.now();
      if (document.visibilityState === "visible") last = now;
      else if (last !== null) {
        active += now - last;
        last = null;
      }
    };
    const tick = window.setInterval(() => {
      if (last !== null) {
        const now = performance.now();
        active += now - last;
        last = now;
      }
      if (active >= delay) show("time");
    }, 1000);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dismissed, hiddenHere, visible, pathname]);

  if (dismissed || hiddenHere) return null;
  const m = messageFor(pathname);

  function dismiss() {
    writeSession(KEY_DISMISSED, "1");
    setDismissed(true);
    track("cta_bar_dismiss", { location: "floating_bar", page: pathname });
  }

  return (
    <aside
      aria-label="Demande de devis"
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:pb-6",
        "transition-all duration-700 ease-[var(--ease-silk)] motion-reduce:transition-none",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <div className="relative flex w-full max-w-[640px] flex-col gap-3 rounded-2xl border border-[color:var(--color-or)]/40 bg-[color:var(--color-cream-paper)]/95 px-4 pb-4 pt-3.5 shadow-[0_18px_50px_-20px_rgba(42,31,20,0.45)] backdrop-blur-md md:flex-row md:items-center md:gap-5 md:rounded-full md:px-6 md:py-3">
        <div className="min-w-0 flex-1 pr-8 md:pr-0">
          <p className="font-display text-[17px] leading-snug text-[color:var(--color-ink-text)] md:truncate md:text-base">
            {m.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-[color:var(--color-espresso)]/75 md:truncate md:text-[12px]">
            {m.sub}
          </p>
        </div>
        <Link
          href={m.href}
          tabIndex={visible ? 0 : -1}
          onClick={() => track(EVENTS.ctaClick, { location: "floating_bar", page: pathname })}
          className="inline-flex w-full shrink-0 items-center justify-center rounded-full bg-[color:var(--color-grenat)] px-5 py-3 text-[12px] uppercase tracking-[0.22em] text-[color:var(--color-bone)] transition-colors duration-300 hover:bg-[color:var(--color-grenat-glow)] md:w-auto md:py-2 md:text-[11px]"
        >
          {m.cta}
        </Link>
        <button
          type="button"
          aria-label="Fermer"
          tabIndex={visible ? 0 : -1}
          onClick={dismiss}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-espresso)]/70 transition-colors hover:bg-[color:var(--color-ash)]/30 hover:text-[color:var(--color-ink-text)] md:static md:-mr-1 md:h-8 md:w-8"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
