import type { Metadata } from "next";
import { CGV_TEXT, cgvVersion, renderCgvHtml } from "@/lib/cgv";

export const metadata: Metadata = {
  title: "Conditions générales de vente — Cosmo Club",
  description:
    "Conditions générales de vente applicables aux prestations Cosmo Club Paris (bar à cocktails, barista, événementiel).",
};

export default function CgvPage() {
  const html = renderCgvHtml(CGV_TEXT);
  const version = cgvVersion();
  const updated = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="mx-auto max-w-3xl px-6 py-20 md:px-10 md:py-28">
      <header className="mb-10 border-b border-[color:var(--color-ash)]/40 pb-8">
        <p className="font-accent text-[11px] uppercase tracking-[0.32em] text-[color:var(--color-or)]">
          Conditions générales de vente
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-[color:var(--color-ink-text)] md:text-5xl">
          Cadre contractuel des prestations Cosmo Club
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-espresso)]/70">
          Document de référence — version&nbsp;{version} · mise à jour le{" "}
          {updated}.
        </p>
      </header>

      <div
        className="cgv-prose"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <style>{`
        .cgv-prose h1 { display: none; }
        .cgv-prose h2 {
          font-family: var(--font-display);
          font-size: 1.4rem;
          line-height: 1.2;
          margin: 2.4rem 0 0.8rem;
          color: var(--color-ink-text);
        }
        .cgv-prose p {
          color: var(--color-espresso);
          line-height: 1.65;
          font-size: 0.97rem;
          margin: 0 0 1rem;
        }
        .cgv-prose ul {
          margin: 0 0 1.2rem 0;
          padding-left: 1.1rem;
          list-style: disc;
          color: var(--color-espresso);
          font-size: 0.97rem;
          line-height: 1.65;
        }
        .cgv-prose li { margin: 0.25rem 0; }
        .cgv-prose strong { color: var(--color-ink-text); font-weight: 600; }
      `}</style>
    </article>
  );
}
