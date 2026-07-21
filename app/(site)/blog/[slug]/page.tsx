import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { site, editorialAuthor } from "@/lib/site";
import { getAllArticles, getArticle } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const articles = await getAllArticles();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `/blog/${slug}`,
      type: "article",
      publishedTime: article.date,
      authors: [editorialAuthor.name],
      tags: article.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.description,
    },
  };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Mirrors the slug logic used elsewhere — kept local to avoid pulling
// a util just for one @id fragment.
function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();

  const personId = `${site.url}/concept#author-${slugify(editorialAuthor.name)}`;
  // Author as Person (with @id) so the BlogPosting and the standalone
  // Person schemas reference the same entity. AI citation models
  // (ChatGPT, Claude) anchor expertise on the Person.@id, so reusing
  // the id everywhere makes the entity stable across articles.
  const blogPostingLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    // article.cover can be a site-relative path (legacy covers) or an
    // absolute Supabase Storage URL (current uploads). Only prefix the
    // site origin for relative paths — blindly concatenating produced
    // "https://www.cosmoclub.frhttps://…", which broke the image and
    // disqualified every article from Google rich results.
    image: article.cover
      ? article.cover.startsWith("http")
        ? article.cover
        : `${site.url}${article.cover}`
      : `${site.url}/opengraph-image`,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Person",
      "@id": personId,
      name: editorialAuthor.name,
      jobTitle: editorialAuthor.role,
      url: editorialAuthor.url,
      worksFor: {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.name,
      },
    },
    publisher: {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
      logo: {
        "@type": "ImageObject",
        url: `${site.url}/brand/cosmo-logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${site.url}/blog/${slug}`,
    },
    keywords: article.keywords?.join(", "),
  };

  // Standalone Person schema — emitted in addition to the embedded
  // Person on BlogPosting. This gives the named author its own
  // discoverable entity for AI crawlers that index people separately
  // (Claude/Perplexity rely on it for "who wrote this?" prompts).
  const personLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": personId,
    name: editorialAuthor.name,
    jobTitle: editorialAuthor.role,
    description: editorialAuthor.bio,
    url: editorialAuthor.url,
    image: editorialAuthor.image,
    sameAs: editorialAuthor.sameAs,
    worksFor: {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
    },
  };

  // Breadcrumb parity with the service pages — the article's trail is
  // Accueil > Blog > title.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: site.url },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${site.url}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: `${site.url}/blog/${article.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <article className="bg-[color:var(--color-cream)]">
        <header className="bg-[color:var(--color-cream-paper)] px-6 pt-40 pb-16 md:px-10 md:pt-56 md:pb-20">
          <div className="mx-auto max-w-[760px]">
            <p className="eyebrow mb-6">
              <span className="rule" />
              <Link
                href="/blog"
                className="transition-colors hover:text-[color:var(--color-grenat)]"
              >
                Le Mag
              </Link>
            </p>
            <h1 className="font-display text-3xl leading-[1.1] text-balance text-[color:var(--color-ink-text)] sm:text-4xl md:text-5xl">
              {article.title}
            </h1>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.32em] text-[color:var(--color-grenat)]">
              <span>
                Par{" "}
                <Link
                  href={editorialAuthor.url}
                  className="underline-offset-4 transition-colors hover:text-[color:var(--color-ink-text)] hover:underline"
                  rel="author"
                >
                  {editorialAuthor.name}
                </Link>
              </span>
              <span aria-hidden>·</span>
              <time dateTime={article.date}>{formatDate(article.date)}</time>
              {article.readingTime && (
                <>
                  <span aria-hidden>·</span>
                  <span>{article.readingTime} de lecture</span>
                </>
              )}
            </div>
          </div>
        </header>
        <div className="px-6 pb-24 pt-16 md:px-10 md:pb-32">
          <div
            className="article-prose mx-auto max-w-[720px]"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
          <div className="mx-auto mt-20 max-w-[720px] border-t border-[color:var(--color-ash-warm)] pt-10 text-center">
            <p className="font-display text-2xl text-[color:var(--color-ink-text)] md:text-3xl">
              Un projet en tête ?
            </p>
            <p className="mt-3 text-[color:var(--color-espresso)]/85">
              Devis sur-mesure sous 48h pour votre mariage, soirée corporate ou
              événement privé à Paris &amp; Île-de-France.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex items-center gap-3 rounded-full bg-[color:var(--color-grenat)] px-8 py-3 font-medium text-[color:var(--color-cream)] transition-colors hover:bg-[color:var(--color-ink-text)]"
            >
              Demander un devis →
            </Link>
          </div>
        </div>
      </article>
    </>
  );
}
