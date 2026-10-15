"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  CircleAlert,
  CloudUpload,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import {
  refreshDocuments,
  startDriveUpload,
} from "@/app/dashboard/(shell)/documents/actions";
import { formatBytes } from "@/lib/drive/format";
import { cn } from "@/lib/utils";

type Status = "waiting" | "uploading" | "done" | "error";
type Job = {
  id: string;
  name: string;
  size: number;
  loaded: number;
  status: Status;
  error?: string;
};

type UploadApi = { pick: () => void; upload: (files: File[]) => void };
const UploadContext = createContext<UploadApi | null>(null);

const PARALLEL = 3;

/**
 * Wraps a folder view: accepts dropped files anywhere inside, exposes
 * `pick()` for the "Ajouter" buttons, and shows a Drive-style progress
 * panel in the corner. Bytes go from the browser straight to Google via
 * a resumable session URL opened by the server action.
 */
export function DriveUploadProvider({
  folderId,
  folderName,
  children,
  className,
}: {
  folderId: string;
  folderName: string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const files = useRef(new Map<string, File>());
  const dragDepth = useRef(0);

  const patch = useCallback((id: string, next: Partial<Job>) => {
    setJobs((all) => all.map((j) => (j.id === id ? { ...j, ...next } : j)));
  }, []);

  const send = useCallback(
    async (id: string): Promise<boolean> => {
      const file = files.current.get(id);
      if (!file) return false;
      patch(id, { status: "uploading", loaded: 0, error: undefined });
      const mimeType = file.type || "application/octet-stream";
      const res = await startDriveUpload({
        parentId: folderId,
        name: file.name,
        mimeType,
        size: file.size,
      });
      if (!res.ok) {
        patch(id, { status: "error", error: res.error });
        return false;
      }
      return new Promise<boolean>((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", res.uploadUrl);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.upload.onprogress = (e) => patch(id, { loaded: e.loaded });
        xhr.onload = () => {
          const ok = xhr.status >= 200 && xhr.status < 300;
          if (ok) files.current.delete(id);
          patch(
            id,
            ok
              ? { status: "done", loaded: file.size }
              : { status: "error", error: `Envoi refusé par Google (${xhr.status}).` },
          );
          resolve(ok);
        };
        xhr.onerror = () => {
          patch(id, { status: "error", error: "Connexion interrompue." });
          resolve(false);
        };
        xhr.send(file);
      });
    },
    [folderId, patch],
  );

  const run = useCallback(
    async (ids: string[]) => {
      let next = 0;
      let added = 0;
      const worker = async () => {
        while (next < ids.length) {
          if (await send(ids[next++])) added++;
        }
      };
      await Promise.all(Array.from({ length: PARALLEL }, worker));
      if (added > 0) {
        await refreshDocuments();
        router.refresh();
      }
    },
    [router, send],
  );

  const upload = useCallback(
    (list: File[]) => {
      if (list.length === 0) return;
      const fresh: Job[] = list.map((file) => {
        const id = crypto.randomUUID();
        files.current.set(id, file);
        return { id, name: file.name, size: file.size, loaded: 0, status: "waiting" };
      });
      setCollapsed(false);
      setJobs((all) => [...all.filter((j) => j.status !== "done"), ...fresh]);
      void run(fresh.map((j) => j.id));
    },
    [run],
  );

  const pick = useCallback(() => inputRef.current?.click(), []);

  const busy = jobs.some((j) => j.status === "uploading" || j.status === "waiting");
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

  return (
    <UploadContext.Provider value={{ pick, upload }}>
      <div
        className={cn("relative", className)}
        onDragEnter={(e) => {
          if (!hasFiles(e)) return;
          dragDepth.current++;
          setDragging(true);
        }}
        onDragOver={(e) => {
          if (hasFiles(e)) e.preventDefault();
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          if (!hasFiles(e)) return;
          e.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          upload(Array.from(e.dataTransfer.files));
        }}
      >
        {children}
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-[color:var(--color-grenat)] bg-white/80 dark:bg-slate-950/80">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-100">
              <CloudUpload className="h-5 w-5" aria-hidden />
              Déposer dans « {folderName} »
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          upload(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {jobs.length > 0 && (
        <UploadPanel
          jobs={jobs}
          busy={busy}
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          onClose={() => {
            files.current.clear();
            setJobs([]);
          }}
          onRetry={(id) => void run([id])}
        />
      )}
    </UploadContext.Provider>
  );
}

export function useDriveUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useDriveUpload outside DriveUploadProvider");
  return ctx;
}

export function UploadButton({ label = "Ajouter" }: { label?: string }) {
  const { pick } = useDriveUpload();
  return (
    <button
      type="button"
      onClick={pick}
      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
    >
      <Upload className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

function UploadPanel({
  jobs,
  busy,
  collapsed,
  onToggle,
  onClose,
  onRetry,
}: {
  jobs: Job[];
  busy: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRetry: (id: string) => void;
}) {
  const done = jobs.filter((j) => j.status === "done").length;
  const failed = jobs.filter((j) => j.status === "error").length;
  const title = busy
    ? `Envoi de ${jobs.length - done - failed} fichier${jobs.length - done - failed > 1 ? "s" : ""}…`
    : failed > 0
      ? `${failed} envoi${failed > 1 ? "s" : ""} en échec`
      : `${done} fichier${done > 1 ? "s" : ""} ajouté${done > 1 ? "s" : ""}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-950 md:bottom-4"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-900">
        <p className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? "Afficher les envois" : "Réduire"}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
        </button>
        {!busy && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center gap-3 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs text-slate-800 dark:text-slate-200">{job.name}</p>
                {job.status === "error" ? (
                  <p className="text-[11px] text-red-600 dark:text-red-400">{job.error}</p>
                ) : job.status === "uploading" ? (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full bg-[color:var(--color-grenat)] transition-[width]"
                      style={{ width: `${job.size ? Math.round((job.loaded / job.size) * 100) : 100}%` }}
                    />
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">{formatBytes(job.size)}</p>
                )}
              </div>
              {job.status === "done" && <Check className="h-4 w-4 text-emerald-600" aria-label="Ajouté" />}
              {job.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />}
              {job.status === "error" && (
                <button
                  type="button"
                  onClick={() => onRetry(job.id)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                >
                  <CircleAlert className="h-3.5 w-3.5 text-red-600" aria-hidden />
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Réessayer
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
