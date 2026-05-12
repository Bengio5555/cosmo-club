import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAllArticles } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Conseils mariage, événementiel & mixologie",
  description:
    "Guides et inspirations pour vos événements à Paris : mariage, soirée corporate, cocktails signature, barista et tendances mixologie 2026. Cosmo Club Paris.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Cosmo Club Paris",
    description: "Guides mariage, événementiel et mixologie premium.",
    url: "/blog",
    type: "website",
  },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogIndexPage() {
  const articles = await getAllArticles();
  return (
    <>
      <PageHeader
        eyebrow="Le journal"
        title="Inspirations,"
        italicWord="guides & savoir-faire."
        description="Tout ce qu'il faut savoir pour réussir votre mariage, votre événement corporate ou votre soirée privée — par les mixologues et baristas de Cosmo Club."
      />
      <section className="bg-[color:var(--color-cream)] py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-6 md:px-10">
          {articles.length === 0 ? (
            <p className="text-center text-[color:var(--color-espresso)]/70">
              Articles à venir prochainement.
            </p>
          ) : (
            <ul className="grid gap-12 md:grid-cols-2">
              {articles.map((article) => (
                <li key={article.slug}>
                  <Link
                    href={`/blog/${article.slug}`}
                    className="group block"
                  >
                    {article.cover && (
                      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-[color:var(--color-cream-paper)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={article.cover}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                        />
                      </div>
                    )}
                    <div className="mt-6 space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-grenat)]">
                        <time dateTime={article.date}>
                          {formatDate(article.date)}
                        </time>
                        {article.readingTime && (
                          <>
                            <span aria-hidden>·</span>
                            <span>{article.readingTime}</span>
                          </>
                        )}
                      </div>
                      <h2 className="font-display text-2xl text-[color:var(--color-ink-text)] transition-colors group-hover:text-[color:var(--color-grenat)] md:text-3xl">
                        {article.title}
                      </h2>
                      <p className="text-[color:var(--color-espresso)]/85">
                        {article.description}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
