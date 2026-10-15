import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DriveError, getItem, listChildren, type DriveItem } from "@/lib/drive/api";
import { DriveConfigError, isDriveConfigured } from "@/lib/drive/auth";
import { eventFolderName } from "@/lib/drive/format";
import { DriveUploadProvider, UploadButton } from "@/components/dashboard/drive/DriveUpload";
import { FileList, FolderGrid, folderHref } from "@/components/dashboard/drive/FileList";
import { PhotoGrid } from "@/components/dashboard/drive/PhotoGrid";
import { EventFolderSetup, EventFolderUnlink } from "./EventFolderControls";

const MAX_MEDIA = 16;
const MAX_FILES = 8;

const card =
  "rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none";

/**
 * Documents block of the event page: the event's Drive folder (photos,
 * contract, logistics) with upload, or the buttons to create/link it.
 * Rendered inside <Suspense> so Drive latency never delays the page.
 */
export async function EventDocuments({
  eventId,
  title,
  date,
  folderId,
}: {
  eventId: string;
  title: string;
  date: string;
  folderId: string | null;
}) {
  if (!isDriveConfigured()) return null;

  if (!folderId) {
    return (
      <section className={card}>
        <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
        <EventFolderSetup eventId={eventId} suggestedName={eventFolderName(date, title)} />
      </section>
    );
  }

  let folder: DriveItem;
  let items: DriveItem[];
  try {
    [folder, items] = await Promise.all([getItem(folderId), listChildren(folderId, 500)]);
  } catch (err) {
    if (!(err instanceof DriveError || err instanceof DriveConfigError)) throw err;
    return (
      <section className={card}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
          <EventFolderUnlink eventId={eventId} />
        </div>
        <p className="text-xs text-red-600 dark:text-red-400">
          Dossier Drive inaccessible : {err.message}
        </p>
      </section>
    );
  }

  const folders = items.filter((i) => i.isFolder);
  const media = items.filter((i) => i.isImage || i.isVideo);
  const files = items.filter((i) => !i.isFolder && !i.isImage && !i.isVideo);
  const more =
    Math.max(0, media.length - MAX_MEDIA) + Math.max(0, files.length - MAX_FILES);

  return (
    <DriveUploadProvider folderId={folder.id} folderName={folder.name} className={card}>
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Documents</h2>
          <Link
            href={folderHref(folder.id)}
            className="truncate text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            {folder.name}
          </Link>
        </div>
        <EventFolderUnlink eventId={eventId} />
        <UploadButton />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-500 dark:border-slate-800">
          Dossier vide. Glissez ici les photos, le contrat ou la fiche technique.
        </p>
      ) : (
        <div className="space-y-4">
          {folders.length > 0 && <FolderGrid folders={folders} />}
          {media.length > 0 && <PhotoGrid items={media.slice(0, MAX_MEDIA)} />}
          {files.length > 0 && <FileList files={files.slice(0, MAX_FILES)} />}
          {more > 0 && (
            <Link
              href={folderHref(folder.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Voir les {media.length + files.length} éléments
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </DriveUploadProvider>
  );
}
