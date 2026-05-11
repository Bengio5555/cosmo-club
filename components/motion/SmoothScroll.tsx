"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const isFirstRun = useRef(true);
  const isPopNav = useRef(false);
  const pathname = usePathname();

  // Track back/forward navigations so the route-change effect can
  // distinguish them from regular PUSH clicks. PUSH = snap top; POP =
  // let the browser restore and sync Lenis to whatever scrollY landed
  // on. Without this, syncing to window.scrollY on PUSH reads the
  // OLD scroll position because Next.js' window.scrollTo(0) hasn't
  // necessarily fired before our effect, so Lenis stays mid-page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPop = () => {
      isPopNav.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      lerp: 0.1,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // PUSH (Link click) → snap Lenis to top so the new page starts at
  // its header. POP (back/forward) → let the browser restore its
  // scroll position, then sync Lenis to whatever scrollY ended up
  // showing. Skip on first mount and on hash URLs so cold loads of
  // /bar#cartes still get the native anchor scroll.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.location.hash) return;

    if (isPopNav.current) {
      isPopNav.current = false;
      const id = requestAnimationFrame(() => {
        const lenis = lenisRef.current;
        if (lenis) lenis.scrollTo(window.scrollY, { immediate: true, force: true });
      });
      return () => cancelAnimationFrame(id);
    }

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
