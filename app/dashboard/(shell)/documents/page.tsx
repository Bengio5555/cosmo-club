import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, LayoutGrid, List, Search, X } from "lucide-react";
import {
  DriveError,
  getAncestors,
  listChildren,
  rootFolderId,
  searchItems,
  type DriveItem,
} from "@/lib/drive/api";
import { DriveConfigError, isDriveConfigured } from "@/lib/drive/auth";
import { DriveUploadProvider, UploadButton } from "@/components/dashboard/drive/DriveUpload";
import { FileList, FolderGrid, folderHref } from "@/components/dashboard/drive/FileList";
import { NewFolderButton } from "@/components/dashboard/drive/NewFolderButton";
import { PhotoGrid } from "@/components/dashboard/drive/PhotoGrid";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Documents" };

type SearchParams = Promise<{ dossier?: string; q?: string; vue?: string }>;

const ROOT_NAME = "Cosmo Club";

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const { dossier, q, vue } = await searchParams;
  const query = q?.trim() ?? "";
  const listView = vue === "liste";

  if (!isDriveConfigured()) {
    return (
      <Shell>
        <Notice>
          Google Drive n&apos;est pas encore branché sur cet environnement. Il
          manque les variables GOOGLE_WIF_AUDIENCE, GOOGLE_DRIVE_SERVICE_ACCOUNT
          et GOOGLE_DRIVE_ROOT_ID.
        </Notice>
      </Shell>
    );
  }

  const rootId = rootFolderId();
  const folderId = dossier || rootId;

  let items: DriveItem[] = [];
  let path: DriveItem[] = [];
  let error: string | null = null;
  try {
    if (query) {
      items = await searchItems(query);
    } else {
      [items, path] = await Promise.all([listChildren(folderId), getAncestors(folderId)]);
    }
  } catch (err) {
    if (!(err instanceof DriveError || err instanceof DriveConfigError)) throw err;
    error = err.message;
  }

  const current = path.at(-1);
  const folderName = current?.name ?? ROOT_NAME;
  const folders = items.filter((i) => i.isFolder);
  const media = items.filter((i) => i.isImage || i.isVideo);
  const others = items.filter((i) => !i.isFolder && !i.isImage && !i.isVideo);

  const href = (v: "grille" | "liste", withQuery = true) => {
    const params = new URLSearchParams();
    if (dossier) params.set("dossier", dossier);
    if (query && withQuery) params.set("q", query);
    if (v === "liste") params.set("vue", "liste");
    const s = params.toString();
    return `/dashboard/documents${s ? `?${s}` : ""}`;
  };
  const viewHref = (v: "grille" | "liste") => href(v);

  return (
    <Shell>
      <DriveUploadProvider folderId={folderId} folderName={folderName}>
        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <form action="/dashboard/documents" className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Rechercher dans tous les documents"
              className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            />
            {listView && <input type="hidden" name="vue" value="liste" />}
          </form>
          <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-800">
            {(["grille", "liste"] as const).map((v) => {
              const active = (v === "liste") === listView;
              const Icon = v === "liste" ? List : LayoutGrid;
              return (
                <Link
                  key={v}
                  href={viewHref(v)}
                  aria-label={v === "liste" ? "Vue liste" : "Vue grille"}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "px-2.5 py-2",
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-white text-slate-500 hover:text-slate-900 dark:bg-slate-900 dark:hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </div>
          {!query && (
            <>
              <NewFolderButton parentId={folderId} />
              <UploadButton />
            </>
          )}
        </div>

        {/* Breadcrumb or search heading */}
        {query ? (
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
            <span>
              {items.length} résultat{items.length > 1 ? "s" : ""} pour « {query} »
            </span>
            <Link href={href(listView ? "liste" : "grille", false)} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white">
              <X className="h-3.5 w-3.5" aria-hidden /> Effacer
            </Link>
          </div>
        ) : (
          <nav aria-label="Emplacement" className="mb-5 flex flex-wrap items-center gap-1 text-sm">
            <Crumb href="/dashboard/documents" current={path.length === 0}>
              {ROOT_NAME}
            </Crumb>
            {path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                <Crumb href={folderHref(p.id)} current={i === path.length - 1}>
                  {p.name}
                </Crumb>
              </span>
            ))}
          </nav>
        )}

        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-800">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {query ? "Aucun document ne correspond." : "Ce dossier est vide"}
            </p>
            {!query && (
              <p className="mt-1 text-xs text-slate-500">
                Glissez des fichiers ici ou utilisez le bouton « Ajouter ».
              </p>
            )}
          </div>
        ) : listView ? (
          <FileList files={items} />
        ) : (
          <div className="space-y-6">
            {folders.length > 0 && (
              <Section title="Dossiers">
                <FolderGrid folders={folders} />
              </Section>
            )}
            {media.length > 0 && (
              <Section title={`Photos et vidéos · ${media.length}`}>
                <PhotoGrid items={media} />
              </Section>
            )}
            {others.length > 0 && (
              <Section title="Fichiers">
                <FileList files={others} />
              </Section>
            )}
          </div>
        )}
      </DriveUploadProvider>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-6 md:px-10 md:py-8">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
          Documents
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Le Drive partagé Cosmo Club : contrats, fiches, plaquettes et photos
          d&apos;événements. Tout ce qui est ajouté ici apparaît aussi dans Google Drive.
        </p>
      </header>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {children}
    </section>
  );
}

function Crumb({ href, current, children }: { href: string; current: boolean; children: React.ReactNode }) {
  return current ? (
    <span aria-current="page" className="font-medium text-slate-900 dark:text-white">
      {children}
    </span>
  ) : (
    <Link href={href} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
      {children}
    </Link>
  );
}

function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "error" }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-xs",
        tone === "error"
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
      )}
    >
      {children}
    </div>
  );
}
