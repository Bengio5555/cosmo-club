"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const isFirstRun = useRef(true);
  const pathname = usePathname();

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

  // On route changes, sync Lenis to wherever the browser ended up:
  // 0 for fresh PUSH (Next.js scrolls to top), restored Y for POP
  // back/forward. Skip on first mount and on hash URLs so the native
  // anchor scroll on cold loads like /bar#cartes isn't clobbered.
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    if (window.location.hash) return;
    const id = requestAnimationFrame(() => {
      const target = window.scrollY;
      const lenis = lenisRef.current;
      if (lenis) lenis.scrollTo(target, { immediate: true, force: true });
    });
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
}
