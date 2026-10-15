"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hasDriveAccess } from "@/lib/drive/access";
import {
  DriveError,
  MAX_UPLOAD_BYTES,
  assertDriveId,
  createFolder,
  createUploadSession,
  findChildFolder,
  getItem,
  listChildren,
  rootFolderId,
} from "@/lib/drive/api";
import { DriveConfigError } from "@/lib/drive/auth";
import { eventFolderName } from "@/lib/drive/format";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const DENIED = { ok: false as const, error: "Accès refusé." };
const EVENTS_FOLDER = "Évènements";

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof DriveError || err instanceof DriveConfigError) {
    return { ok: false, error: err.message };
  }
  console.error("[drive]", err);
  return { ok: false, error: "Google Drive ne répond pas. Réessayez." };
}

function cleanName(raw: unknown, max = 120) {
  if (typeof raw !== "string") return null;
  const name = raw.replace(/[\u0000-\u001f]/g, "").trim();
  return name && name.length <= max ? name : null;
}

export async function createDriveFolder(
  parentId: string,
  rawName: string,
): Promise<Result<{ id: string }>> {
  if (!(await hasDriveAccess())) return DENIED;
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "Nom de dossier invalide (120 caractères max)." };
  try {
    const folder = await createFolder(assertDriveId(parentId), name);
    revalidatePath("/dashboard/documents");
    return { ok: true, id: folder.id };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Open a resumable upload for one file. Returns Google's session URL;
 * the browser sends the bytes there directly. The URL is single-use
 * (one file, one folder) and expires within a week.
 */
export async function startDriveUpload(input: {
  parentId: string;
  name: string;
  mimeType: string;
  size: number;
}): Promise<Result<{ uploadUrl: string }>> {
  if (!(await hasDriveAccess())) return DENIED;
  const name = cleanName(input.name, 255);
  if (!name) return { ok: false, error: "Nom de fichier invalide." };
  if (!Number.isInteger(input.size) || input.size < 0 || input.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "Fichier trop lourd (2 Go maximum)." };
  }
  const mimeType =
    typeof input.mimeType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(input.mimeType)
      ? input.mimeType
      : "application/octet-stream";

  // Next already rejects server actions whose Origin doesn't match the
  // host, so this is the dashboard's own origin.
  const origin = (await headers()).get("origin");
  if (!origin) return { ok: false, error: "Origine de la requête manquante." };

  try {
    const uploadUrl = await createUploadSession({
      parentId: assertDriveId(input.parentId),
      name,
      mimeType,
      size: input.size,
      origin,
    });
    return { ok: true, uploadUrl };
  } catch (err) {
    return fail(err);
  }
}

export async function refreshDocuments() {
  if (!(await hasDriveAccess())) return;
  revalidatePath("/dashboard/documents");
  revalidatePath("/dashboard/events", "layout");
}

async function eventsFolderId() {
  const root = rootFolderId();
  const existing = await findChildFolder(root, EVENTS_FOLDER);
  return existing?.id ?? (await createFolder(root, EVENTS_FOLDER)).id;
}

/** Sub-folders of "Évènements", offered when linking an existing folder. */
export async function listEventFolders(): Promise<
  Result<{ folders: { id: string; name: string }[] }>
> {
  if (!(await hasDriveAccess())) return DENIED;
  try {
    const children = await listChildren(await eventsFolderId());
    return {
      ok: true,
      folders: children
        .filter((c) => c.isFolder)
        .map((c) => ({ id: c.id, name: c.name }))
        // Dated folders ("2026-11-12 – …") newest first, then the older
        // hand-named ones ("Yext 26", "Solaris"…) alphabetically.
        .sort((a, b) => {
          const da = /^\d{4}-\d{2}-\d{2}/.test(a.name);
          const db = /^\d{4}-\d{2}-\d{2}/.test(b.name);
          if (da !== db) return da ? -1 : 1;
          return da
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
        }),
    };
  } catch (err) {
    return fail(err);
  }
}

async function setEventFolder(eventId: string, folderId: string | null) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ drive_folder_id: folderId })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function createEventFolder(eventId: string): Promise<Result> {
  if (!(await hasDriveAccess())) return DENIED;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, title, date, drive_folder_id")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Événement introuvable." };
  if (event.drive_folder_id) return { ok: true };
  try {
    const parent = await eventsFolderId();
    const name = eventFolderName(event.date, event.title);
    const folder =
      (await findChildFolder(parent, name)) ?? (await createFolder(parent, name));
    await setEventFolder(event.id, folder.id);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function linkEventFolder(
  eventId: string,
  folderId: string | null,
): Promise<Result> {
  if (!(await hasDriveAccess())) return DENIED;
  try {
    if (folderId) {
      const folder = await getItem(assertDriveId(folderId));
      if (!folder.isFolder) return { ok: false, error: "Choisissez un dossier." };
    }
    await setEventFolder(eventId, folderId);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
