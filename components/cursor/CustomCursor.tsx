"use client";

import { useEffect, useRef } from "react";

type Variant = "default" | "hover" | "text";

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) return;

    const dot = dotRef.current;
    if (!dot) return;

    const onMove = (e: MouseEvent) => {
      pos.current.tx = e.clientX;
      pos.current.ty = e.clientY;
    };

    const tick = () => {
      const p = pos.current;
      p.x += (p.tx - p.x) * 0.22;
      p.y += (p.ty - p.y) * 0.22;
      dot.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%)`;
      raf.current = requestAnimationFrame(tick);
    };

    const setVariant = (v: Variant) => dot.setAttribute("data-variant", v);

    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("a, button, [role='button'], [data-cursor='hover']")) {
        setVariant("hover");
      } else if (
        target.closest("input, textarea, [contenteditable='true'], [data-cursor='text']")
      ) {
        setVariant("text");
      } else {
        setVariant("default");
      }
    };

    const onLeave = () => setVariant("default");

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return <div ref={dotRef} className="cursor-dot" data-variant="default" aria-hidden />;
}
