import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import type { DriveItem } from "@/lib/drive/api";
import { downloadUrl, formatBytes } from "@/lib/drive/format";
import { formatDateFR } from "@/lib/format";
import { FileIcon } from "./FileIcon";

export function folderHref(id: string) {
  return `/dashboard/documents?dossier=${encodeURIComponent(id)}`;
}

/** Folder tiles, Drive-style. */
export function FolderGrid({ folders }: { folders: DriveItem[] }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2.5">
      {folders.map((f) => (
        <li key={f.id}>
          <Link
            href={folderHref(f.id)}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900"
          >
            <FileIcon mimeType={f.mimeType} name={f.name} className="h-5 w-5" />
            <span className="truncate">{f.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Rows with name, date, size and the two ways to open a file. */
export function FileList({ files }: { files: DriveItem[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/60">
      <div className="hidden grid-cols-[minmax(0,1fr)_8rem_5rem_4.5rem] gap-3 border-b border-slate-100 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-900 sm:grid">
        <span>Nom</span>
        <span>Modifié</span>
        <span>Taille</span>
        <span className="sr-only">Actions</span>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-900">
        {files.map((f) => (
          <li
            key={f.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_5rem_4.5rem]"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FileIcon mimeType={f.mimeType} name={f.name} />
              {f.isFolder ? (
                <Link href={folderHref(f.id)} className="truncate text-slate-800 hover:underline dark:text-slate-200">
                  {f.name}
                </Link>
              ) : (
                <span className="truncate text-slate-800 dark:text-slate-200">{f.name}</span>
              )}
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">{formatDateFR(f.modifiedTime)}</span>
            <span className="hidden text-xs text-slate-500 sm:block">
              {f.isFolder || f.isGoogleNative ? "—" : formatBytes(f.size)}
            </span>
            <span className="flex justify-end gap-1">
              {!f.isFolder && !f.isGoogleNative && (
                <a
                  href={downloadUrl(f.id)}
                  aria-label={`Télécharger ${f.name}`}
                  title="Télécharger"
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <Download className="h-4 w-4" />
                </a>
              )}
              {f.webViewLink && !f.isFolder && (
                <a
                  href={f.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ouvrir ${f.name} dans Google Drive`}
                  title="Ouvrir dans Google Drive"
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
