import { site } from "@/lib/site";

/**
 * Open Graph defaults to spread into every page-level `openGraph` block.
 *
 * Next replaces the layout's `openGraph` object wholesale as soon as a page
 * defines its own, so siteName, locale and the share image silently vanish
 * on every page that customises its title. Spread this first, then override.
 */
export function ogDefaults(image?: { url: string; alt: string; width?: number; height?: number }) {
  const img = image ?? { url: "/opengraph-image", alt: `${site.name} — ${site.tagline}` };
  return {
    type: "website" as const,
    locale: "fr_FR",
    siteName: site.name,
    images: [{ url: img.url, width: img.width ?? 1200, height: img.height ?? 630, alt: img.alt }],
  };
}
