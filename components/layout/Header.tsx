"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[var(--ease-silk)]",
          scrolled
            ? "backdrop-blur-md bg-[color:var(--color-cream-paper)]/70 border-b border-[color:var(--color-ash)]/60"
            : "bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 md:px-10">
          <Logo />

          <nav className="hidden md:flex items-center gap-8" aria-label="Menu principal">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="relative text-[12px] uppercase tracking-[0.28em] text-[color:var(--color-espresso)]/80 transition-colors duration-300 hover:text-[color:var(--color-grenat)]"
              >
                <span>{item.label}</span>
                <span className="pointer-events-none absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-[color:var(--color-grenat)] transition-transform duration-500 ease-[var(--ease-silk)] hover:scale-x-100 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="hidden md:block">
            <Link
              href="/contact"
              className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-[color:var(--color-or)]/40 px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-ink-text)] transition-colors duration-500"
            >
              <span className="absolute inset-0 -z-0 translate-y-full bg-[color:var(--color-grenat)] transition-transform duration-500 ease-[var(--ease-silk)] group-hover:translate-y-0" />
              <span className="relative z-10">Demander un devis</span>
              <span className="relative z-10 h-[1px] w-5 bg-current" />
            </Link>
          </div>

          <button
            type="button"
            aria-label="Ouvrir le menu"
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-ash)]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[color:var(--color-cream-paper)]/98 backdrop-blur-xl transition-all duration-700 ease-[var(--ease-silk)] md:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div className="flex h-full flex-col items-start justify-center gap-8 px-8 pt-24">
          {nav.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "font-display text-4xl tracking-tight text-[color:var(--color-ink-text)] transition-all duration-700",
                open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0",
              )}
              style={{ transitionDelay: `${150 + i * 80}ms` }}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex items-center gap-3 rounded-full border border-[color:var(--color-or)] px-6 py-3 text-xs uppercase tracking-[0.28em]"
          >
            Demander un devis
          </Link>
        </div>
      </div>
    </>
  );
}
