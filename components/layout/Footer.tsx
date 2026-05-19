import Link from "next/link";
import { site, nav } from "@/lib/site";
import { Logo } from "./Logo";
import { TrackedAnchor } from "@/components/analytics/TrackedAnchor";
import { TrackedNextLink } from "@/components/analytics/TrackedNextLink";

export function Footer() {
  return (
    <footer className="relative border-t border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream-paper)] pt-20 pb-10">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div className="grid gap-14 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_1fr]">
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
                    className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Prestations" className="space-y-4">
            <p className="eyebrow">Prestations</p>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/bar-a-cocktails/mariage" className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]">
                  Mariage
                </Link>
              </li>
              <li>
                <Link href="/bar-a-cocktails/anniversaire" className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]">
                  Anniversaire
                </Link>
              </li>
              <li>
                <Link href="/bar-a-cocktails/entreprise" className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]">
                  Entreprise
                </Link>
              </li>
              <li>
                <Link href="/barman-prive-paris" className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]">
                  Barman privé
                </Link>
              </li>
              <li>
                <Link href="/animation-cocktail-paris" className="text-[color:var(--color-espresso)]/80 transition-colors hover:text-[color:var(--color-grenat)]">
                  Atelier mixologie
                </Link>
              </li>
            </ul>
          </nav>

          <div className="space-y-4">
            <p className="eyebrow">Nous écrire</p>
            <ul className="space-y-3 text-sm">
              <li className="text-[color:var(--color-espresso)]/70">{site.address.city} — {site.address.detail}</li>
              <li>
                <TrackedAnchor
                  event="email_click"
                  location="footer"
                  href={`mailto:${site.email}`}
                  className="text-[color:var(--color-espresso)] hover:text-[color:var(--color-grenat)]"
                >
                  {site.email}
                </TrackedAnchor>
              </li>
              <li>
                <TrackedAnchor
                  event="phone_click"
                  location="footer"
                  href={`tel:${site.phone}`}
                  className="text-[color:var(--color-espresso)] hover:text-[color:var(--color-grenat)]"
                >
                  {site.phoneDisplay}
                </TrackedAnchor>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <p className="eyebrow">Suivre</p>
            <ul className="space-y-3 text-sm">
              <li>
                <TrackedAnchor
                  event="instagram_click"
                  location="footer"
                  href={site.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[color:var(--color-espresso)] hover:text-[color:var(--color-grenat)]"
                >
                  Instagram <span aria-hidden>↗</span>
                </TrackedAnchor>
              </li>
              <li className="text-[color:var(--color-espresso)]/70">{site.instagramHandle}</li>
            </ul>
            <div className="hairline" />
            <TrackedNextLink
              event="devis_cta_click"
              location="footer"
              href="/contact"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-[color:var(--color-grenat)] hover:text-[color:var(--color-grenat-glow)]"
            >
              Demander un devis <span aria-hidden>→</span>
            </TrackedNextLink>
          </div>
        </div>

        <div className="mt-16 flex flex-col-reverse items-start justify-between gap-6 text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-espresso)]/50 md:flex-row md:items-end">
          <p>© {new Date().getFullYear()} {site.name} — Tous droits réservés</p>
        </div>
      </div>
    </footer>
  );
}
