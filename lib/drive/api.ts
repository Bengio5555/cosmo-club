import "server-only";
import { driveConfig, getDriveAccessToken } from "./auth";

/**
 * Thin wrapper around the Drive v3 REST API, scoped to the "Cosmo Club"
 * shared drive. Every id that comes from a request goes through
 * `assertDriveId` (format) and, before any read or write, through
 * `getItem` which refuses anything living outside that shared drive.
 */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const ITEM_FIELDS =
  "id,name,mimeType,size,modifiedTime,webViewLink,hasThumbnail,driveId,parents,trashed";

export const MAX_UPLOAD_BYTES = 2 * 1024 ** 3;

export type DriveItem = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
  isImage: boolean;
  isVideo: boolean;
  /** Google Docs/Sheets/Slides: no binary, open in Google instead. */
  isGoogleNative: boolean;
  size: number | null;
  modifiedTime: string | null;
  webViewLink: string | null;
  hasThumbnail: boolean;
  parentId: string | null;
};

type RawItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  hasThumbnail?: boolean;
  driveId?: string;
  parents?: string[];
  trashed?: boolean;
};

export class DriveError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
  }
}

const ID_RE = /^[A-Za-z0-9_-]{10,128}$/;

export function assertDriveId(id: unknown): string {
  if (typeof id !== "string" || !ID_RE.test(id)) {
    throw new DriveError("Identifiant de fichier invalide.", 400);
  }
  return id;
}

/** Escape a value for a Drive `q` string literal. */
function q(value: string) {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function toItem(raw: RawItem): DriveItem {
  const isFolder = raw.mimeType === FOLDER_MIME;
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    isFolder,
    isImage: raw.mimeType.startsWith("image/"),
    isVideo: raw.mimeType.startsWith("video/"),
    isGoogleNative:
      !isFolder && raw.mimeType.startsWith("application/vnd.google-apps."),
    size: raw.size ? Number(raw.size) : null,
    modifiedTime: raw.modifiedTime ?? null,
    webViewLink: raw.webViewLink ?? null,
    hasThumbnail: Boolean(raw.hasThumbnail),
    parentId: raw.parents?.[0] ?? null,
  };
}

async function driveFetch(url: string, init: RequestInit = {}) {
  const token = await getDriveAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const status = res.status === 404 ? 404 : res.status === 403 ? 403 : 502;
    throw new DriveError(
      status === 404
        ? "Fichier introuvable."
        : status === 403
          ? "Accès refusé par Google Drive."
          : `Google Drive a répondu ${res.status}.`,
      status,
    );
  }
  return res;
}

function withDriveParams(params: Record<string, string>) {
  return new URLSearchParams({
    supportsAllDrives: "true",
    ...params,
  }).toString();
}

export function rootFolderId() {
  return driveConfig().rootId;
}

/**
 * Fetch one item and make sure it belongs to the Cosmo Club shared drive.
 * The shared drive's root has the drive id as its own id.
 */
export async function getItem(id: string): Promise<DriveItem> {
  assertDriveId(id);
  const { rootId } = driveConfig();
  const res = await driveFetch(
    `${API}/files/${id}?${withDriveParams({ fields: ITEM_FIELDS })}`,
  );
  const raw = (await res.json()) as RawItem;
  if (raw.driveId !== rootId && raw.id !== rootId) {
    throw new DriveError("Fichier introuvable.", 404);
  }
  if (raw.trashed) throw new DriveError("Ce fichier est dans la corbeille.", 404);
  return toItem(raw);
}

async function listQuery(query: string, limit: number, orderBy: string) {
  const { rootId } = driveConfig();
  const items: DriveItem[] = [];
  let pageToken: string | undefined;
  do {
    const params: Record<string, string> = {
      q: query,
      corpora: "drive",
      driveId: rootId,
      includeItemsFromAllDrives: "true",
      fields: `nextPageToken,files(${ITEM_FIELDS})`,
      pageSize: String(Math.min(limit - items.length, 1000)),
    };
    if (orderBy) params.orderBy = orderBy;
    if (pageToken) params.pageToken = pageToken;
    const res = await driveFetch(`${API}/files?${withDriveParams(params)}`);
    const body = (await res.json()) as {
      files: RawItem[];
      nextPageToken?: string;
    };
    items.push(...body.files.map(toItem));
    pageToken = body.nextPageToken;
  } while (pageToken && items.length < limit);
  return items;
}

/** Children of a folder, folders first then natural name order. */
export async function listChildren(folderId: string, limit = 2000) {
  assertDriveId(folderId);
  return listQuery(
    `${q(folderId)} in parents and trashed = false`,
    limit,
    "folder,name_natural",
  );
}

/** Full-text search (names and content) across the whole shared drive. */
export async function searchItems(text: string, limit = 100) {
  const needle = text.trim().slice(0, 100);
  if (!needle) return [];
  // fullText can't be combined with orderBy; results come by relevance.
  return listQuery(
    `(name contains ${q(needle)} or fullText contains ${q(needle)}) and trashed = false`,
    limit,
    "",
  );
}

/** Path from the shared drive root down to (and including) `id`. */
export async function getAncestors(id: string): Promise<DriveItem[]> {
  const { rootId } = driveConfig();
  const chain: DriveItem[] = [];
  let current: string | null = id;
  for (let depth = 0; current && current !== rootId && depth < 20; depth++) {
    const item = await getItem(current);
    chain.unshift(item);
    current = item.parentId;
  }
  return chain;
}

export async function createFolder(parentId: string, name: string) {
  await getItem(parentId);
  const res = await driveFetch(
    `${API}/files?${withDriveParams({ fields: ITEM_FIELDS })}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
    },
  );
  return toItem((await res.json()) as RawItem);
}

/** Case- and accent-insensitive lookup of a direct sub-folder. */
export async function findChildFolder(parentId: string, name: string) {
  const norm = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
  const children = await listChildren(parentId);
  return children.find((c) => c.isFolder && norm(c.name) === norm(name)) ?? null;
}

/**
 * Start a resumable upload and return the session URL. The browser then
 * PUTs the bytes straight to Google (no 4.5 MB function body limit).
 * The URL only allows uploading this one file into this one folder.
 * Passing the page's Origin makes Google answer the browser's CORS.
 */
export async function createUploadSession(input: {
  parentId: string;
  name: string;
  mimeType: string;
  size: number;
  origin: string;
}) {
  const parent = await getItem(input.parentId);
  if (!parent.isFolder) throw new DriveError("Destination invalide.", 400);
  const res = await driveFetch(
    `${UPLOAD_API}/files?${withDriveParams({ uploadType: "resumable", fields: "id" })}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": input.mimeType,
        "x-upload-content-length": String(input.size),
        origin: input.origin,
      },
      body: JSON.stringify({ name: input.name, parents: [input.parentId] }),
    },
  );
  const location = res.headers.get("location");
  if (!location) throw new DriveError("Google n'a pas ouvert l'envoi.", 502);
  return location;
}

/** Thumbnail bytes (Drive renders previews for images, videos, PDFs…). */
export async function fetchThumbnail(id: string, size: number) {
  assertDriveId(id);
  const item = await getItem(id);
  if (!item.hasThumbnail) throw new DriveError("Pas d'aperçu.", 404);
  const res = await driveFetch(
    `${API}/files/${id}?${withDriveParams({ fields: "thumbnailLink" })}`,
  );
  const { thumbnailLink } = (await res.json()) as { thumbnailLink?: string };
  if (!thumbnailLink) throw new DriveError("Pas d'aperçu.", 404);
  const url = new URL(thumbnailLink);
  // Only ever follow Google's own thumbnail hosts (defence in depth).
  if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) {
    throw new DriveError("Aperçu indisponible.", 502);
  }
  // thumbnailLink ends with "=s220"; ask for the size we need instead.
  const sized = thumbnailLink.replace(/=s\d+(-c)?$/, `=s${size}`);
  return driveFetch(sized);
}

/** Original bytes, streamed. Google-native docs have none. */
export async function fetchContent(id: string) {
  const item = await getItem(id);
  if (item.isFolder || item.isGoogleNative) {
    throw new DriveError("Ce document s'ouvre dans Google.", 400);
  }
  const res = await driveFetch(
    `${API}/files/${id}?${withDriveParams({ alt: "media" })}`,
  );
  return { item, res };
}
