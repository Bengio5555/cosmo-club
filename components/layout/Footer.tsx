import Link from "next/link";
import { site, nav } from "@/lib/site";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="relative border-t border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream-paper)] pt-20 pb-10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-14 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <div className="space-y-6">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-[color:var(--color-espresso)]/70">
              {site.description}
            </p>
            <div className="hairline" />
            <p className="font-accent text-xl italic text-[color:var(--color-grenat)]">
              « {site.baseline} »
            </p>
          </div>

          <nav aria-label="Pages" className="space-y-4">
            <p className="eyebrow">Explorer</p>
            <ul className="space-y-3 text-sm">
              {nav.map((n) => (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-or)]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-4">
            <p className="eyebrow">Nous écrire</p>
            <ul className="space-y-3 text-sm">
              <li className="text-[color:var(--color-espresso)]/70">{site.address.city} — {site.address.detail}</li>
              <li>
                <a href={`mailto:${site.email}`} className="text-[color:var(--color-espresso)] hover:text-[color:var(--color-or)]">
                  {site.email}
                </a>
              </li>
              <li>
                <a href={`tel:${site.phone}`} className="text-[color:var(--color-espresso)] hover:text-[color:var(--color-or)]">
                  {site.phoneDisplay}
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="eyebrow">Suivre</p>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={site.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[color:var(--color-espresso)] hover:text-[color:var(--color-or)]"
                >
                  Instagram <span aria-hidden>↗</span>
                </a>
              </li>
              <li className="text-[color:var(--color-espresso)]/70">{site.instagramHandle}</li>
            </ul>
            <div className="hairline" />
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[color:var(--color-or)] hover:text-[color:var(--color-grenat)]"
            >
              Demander un devis <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-6 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-espresso)]/50 md:flex-row md:items-end">
          <p>© {new Date().getFullYear()} {site.name} — Tous droits réservés</p>
          <p className="font-display text-[10vw] leading-none text-[color:var(--color-espresso)]/5 md:text-[6vw]">
            COSMO · CLUB
          </p>
        </div>
      </div>
    </footer>
  );
}
