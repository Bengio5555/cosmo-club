"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload, Eye, Save } from "lucide-react";
import { marked } from "marked";
import {
  STATUS_LABEL,
  STATUS_TONE,
  slugify,
  type ArticleRow,
  type ArticleStatus,
} from "./types";
import { saveAndContinue, deleteArticle, uploadCover } from "./actions";
import { AiPanel } from "./AiPanel";
import { BriefPanel } from "./BriefPanel";
import type { GeneratedArticle } from "@/lib/blog/ai";

type Props = {
  initial: Partial<ArticleRow> & { id?: string };
};

const STATUS_OPTIONS: ArticleStatus[] = ["draft", "scheduled", "published"];

// The publish_at field is a string in ISO format on the DB side. The
// browser <input type="datetime-local"> wants a "YYYY-MM-DDTHH:mm"
// shape, so we round-trip through these helpers to keep the form
// stable.
function toLocalInput(iso?: string | null): string {
  if (!iso) return new Date().toISOString().slice(0, 16);
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

export function ArticleEditor({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [description, setDescription] = useState(initial.description ?? "");
  const [bodyMd, setBodyMd] = useState(initial.body_md ?? "");
  const [coverUrl, setCoverUrl] = useState(initial.cover_url ?? "");
  const [readingTime, setReadingTime] = useState(initial.reading_time ?? "");
  const [keywords, setKeywords] = useState((initial.keywords ?? []).join(", "));
  const [tags, setTags] = useState((initial.tags ?? []).join(", "));
  const [status, setStatus] = useState<ArticleStatus>(
    (initial.status as ArticleStatus) ?? "draft",
  );
  const [publishAt, setPublishAt] = useState(toLocalInput(initial.publish_at));
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);

  // Auto-slug from title until the author manually edits the slug input.
  const onTitleChange = (next: string) => {
    setTitle(next);
    if (!slugTouched) setSlug(slugify(next));
  };

  // Populate the editor from an AI-generated draft. Replaces every
  // field — the brief panel is only available on /new so we never
  // overwrite an existing in-progress edit.
  const applyDraft = (draft: GeneratedArticle) => {
    setTitle(draft.title);
    setSlug(draft.slug);
    setSlugTouched(true);
    setDescription(draft.description);
    setBodyMd(draft.body_md);
    setReadingTime(draft.reading_time);
    setKeywords(draft.keywords.join(", "));
    setTags(draft.tags.join(", "));
    setTab("write");
  };

  const previewHtml = useMemo(() => {
    if (!bodyMd) return "<p class='text-slate-500 dark:text-slate-500'>Aucun contenu à prévisualiser.</p>";
    return marked.parse(bodyMd) as string;
  }, [bodyMd]);

  const onPickCover = useCallback(
    async (file: File) => {
      setServerError(null);
      setUploading(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const result = await uploadCover(slug || "article", fd);
        if (result.ok) {
          setCoverUrl(result.data.url);
        } else {
          setServerError(result.error);
        }
      } finally {
        setUploading(false);
      }
    },
    [slug],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const fd = new FormData();
    fd.set("title", title);
    fd.set("slug", slug);
    fd.set("description", description);
    fd.set("body_md", bodyMd);
    fd.set("cover_url", coverUrl);
    fd.set("reading_time", readingTime);
    fd.set("keywords", keywords);
    fd.set("tags", tags);
    fd.set("status", status);
    fd.set("publish_at", fromLocalInput(publishAt));

    startTransition(async () => {
      const result = await saveAndContinue(initial.id ?? null, fd);
      if (typeof result === "string") setServerError(result);
    });
  };

  const onDelete = () => {
    if (!initial.id) return;
    if (!confirm(`Supprimer définitivement l'article "${title}" ?`)) return;
    startTransition(async () => {
      const result = await deleteArticle(initial.id!);
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      router.push("/dashboard/blog");
      router.refresh();
    });
  };

  const isNew = !initial.id;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
            {isNew ? "Nouvel article" : "Édition"}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {isNew
              ? "Composez le brouillon, choisissez sa date, publiez quand vous voulez."
              : `Statut actuel : ${STATUS_LABEL[status]}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={onDelete}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </button>
          )}
          <button
            type="submit"
            disabled={pending || uploading}
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </header>

      {serverError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {serverError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* Left column: title + content */}
        <div className="space-y-4">
          <Field label="Titre">
            <input
              type="text"
              required
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Le titre éditorial de l'article"
              className="block w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
            />
          </Field>

          <Field label="Description (méta + chapô)">
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Phrase courte qui décrit l'article. Sert de méta description et de chapeau sur la liste."
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
            />
          </Field>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-3 py-2">
              <div className="flex gap-1">
                <TabButton active={tab === "write"} onClick={() => setTab("write")}>
                  Rédaction
                </TabButton>
                <TabButton active={tab === "preview"} onClick={() => setTab("preview")}>
                  <Eye className="mr-1 inline h-3.5 w-3.5" />
                  Aperçu
                </TabButton>
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
                Markdown
              </span>
            </div>
            {tab === "write" ? (
              <textarea
                value={bodyMd}
                onChange={(e) => setBodyMd(e.target.value)}
                rows={26}
                placeholder={`## Section\n\nVotre prose ici, en markdown.\n\n- Listes\n- **gras**\n- *italique*\n- [liens](/url)`}
                className="block w-full resize-y rounded-b-md bg-transparent px-4 py-3 font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
              />
            ) : (
              <div
                className="article-prose max-w-none px-4 py-4 text-[15px]"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </div>

        {/* Right column: metadata + status */}
        <div className="space-y-4">
          {isNew && <BriefPanel onDraft={applyDraft} />}

          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Publication</h2>

            <div className="mt-4 space-y-3">
              <Field label="Statut">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-slate-600 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
                  <span className={`mr-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${STATUS_TONE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                  {status === "draft" && "Invisible sur le site."}
                  {status === "scheduled" && "Devient visible à la date ci-dessous."}
                  {status === "published" && "Visible publiquement immédiatement."}
                </p>
              </Field>

              <Field label="Date de publication">
                <input
                  type="datetime-local"
                  value={publishAt}
                  onChange={(e) => setPublishAt(e.target.value)}
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-slate-600 focus:outline-none"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Image de couverture</h2>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              4:3 idéal, 5 Mo max. PNG/JPG/WEBP.
            </p>
            <div className="mt-3 space-y-3">
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl}
                  alt=""
                  className="aspect-[4/3] w-full rounded-md border border-slate-200 dark:border-slate-800 object-cover"
                />
              )}
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 transition hover:border-slate-500 hover:text-slate-900 dark:hover:text-white">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? "Upload…" : coverUrl ? "Remplacer l'image" : "Choisir une image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickCover(f);
                    e.target.value = "";
                  }}
                />
              </label>
              <input
                type="text"
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="/brand/ai/... ou URL https"
                className="block w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
              />
            </div>
          </section>

          <AiPanel
            articleId={initial.id ?? null}
            initialGmbPost={initial.gmb_post ?? null}
            initialGmbCoverUrl={initial.gmb_cover_url ?? null}
            onCoverGenerated={(url) => setCoverUrl(url)}
          />

          <section className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Référencement</h2>
            <div className="mt-4 space-y-3">
              <Field label="Slug (URL)">
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="cocktails-signature-mai-carnet-saison"
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
                  /blog/{slug || "votre-slug"}
                </p>
              </Field>

              <Field label="Temps de lecture (libre)">
                <input
                  type="text"
                  value={readingTime}
                  onChange={(e) => setReadingTime(e.target.value)}
                  placeholder="6 min"
                  className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
              </Field>

              <Field label="Mots-clés SEO (séparés par virgules)">
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="cocktail mariage Paris, mixologie événementiel"
                  className="block w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
              </Field>

              <Field label="Tags éditoriaux (affichés)">
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Mariage, Guide"
                  className="block w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-slate-600 focus:outline-none"
                />
              </Field>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs transition ${
        active
          ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white"
          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
