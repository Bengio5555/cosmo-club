import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { fontClassName } from "@/lib/fonts";
import { site } from "@/lib/site";
import "./globals.css";

// GA4 measurement ID. Lit l'env d'abord pour rester configurable
// (preview/dev = sans GA pour ne pas polluer les stats prod). Fallback
// vers la valeur prod en clair pour ne jamais casser le tracking en
// cas d'oubli côté Vercel.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-MWLCN3KLW9";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.shortName}`,
  },
  description: site.description,
  keywords: [
    "bar à cocktails",
    "mixologie",
    "événementiel Paris",
    "mariage",
    "barista",
    "Cosmo Club",
  ],
  authors: [{ name: site.name }],
  creator: site.name,
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: site.url,
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#ede3c9",
  colorScheme: "light",
};

// Organization-level JSON-LD emitted on every page. LLMs and search
// engines aggregate this across crawls to build their entity graph —
// keeping it identical on every route reinforces the canonical
// identity of Cosmo Club Paris.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${site.url}/#organization`,
  name: site.name,
  alternateName: site.shortName,
  url: site.url,
  logo: `${site.url}/brand/cosmo-logo.png`,
  image: `${site.url}/opengraph-image`,
  description: site.description,
  email: site.email,
  telephone: site.phone.replace(/\s/g, ""),
  address: {
    "@type": "PostalAddress",
    addressLocality: "Paris",
    addressRegion: "Île-de-France",
    addressCountry: "FR",
  },
  areaServed: [
    { "@type": "City", name: "Paris" },
    { "@type": "AdministrativeArea", name: "Île-de-France" },
  ],
  sameAs: [site.instagram],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: site.phone.replace(/\s/g, ""),
    email: site.email,
    contactType: "Devis et réservations",
    areaServed: "FR",
    availableLanguage: ["fr", "en"],
  },
  knowsLanguage: ["fr", "en"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={fontClassName} suppressHydrationWarning>
      <head>
        {/* No-flash theme bootstrap. Runs in <head> before any paint:
            on /dashboard routes it reads the saved preference (or the OS
            scheme) and, if dark, sets `.dark` on <html> AND paints the
            dark background immediately — so reloads don't flash the cream
            body before the dark dashboard chrome mounts. No-op on the
            public site (which is always cream). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  if(location.pathname.indexOf('/dashboard')!==0)return;
  var t=localStorage.getItem('dashboardTheme');
  var dark=t==='dark'||(t!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  var el=document.documentElement;
  if(dark){el.classList.add('dark');el.setAttribute('data-theme','dark');el.style.background='#020617';}
  else{el.setAttribute('data-theme','light');}
}catch(e){}})();`,
          }}
        />
        {/* Preconnect to Supabase Storage — every public page pulls
            covers, gallery tiles and logos from there. Saves ~300 ms on
            LCP by warming up TLS before the first image request. */}
        <link
          rel="preconnect"
          href="https://rqqjndxxjpsdkbtqikyn.supabase.co"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://rqqjndxxjpsdkbtqikyn.supabase.co" />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        {children}
        <Analytics />
        <SpeedInsights />
        {/* Google Analytics 4 — chargé en `afterInteractive` par
            @next/third-parties, donc n'impacte pas le LCP. Tracking
            désactivé en dev (le composant ignore l'injection quand
            NODE_ENV !== 'production'). */}
        <GoogleAnalytics gaId={GA_ID} />
      </body>
    </html>
  );
}
