"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Upload,
  Trash2,
  RefreshCw,
  Check,
} from "lucide-react";
import { LABEL_OPTIONS, type Config, type ImageConfig } from "@/types/admin";
import {
  uploadDashboardImage,
  updateImageSlot,
  deleteDashboardImageByProxy,
} from "./actions";

const ORIENTATIONS: Array<{
  value: ImageConfig["orientation"];
  label: string;
  glyph: string;
}> = [
  { value: "landscape", label: "Paysage", glyph: "⬅️➡️" },
  { value: "square", label: "Carré", glyph: "⬜" },
  { value: "portrait", label: "Portrait", glyph: "⬇️" },
];

export function ImagesManager({ initialConfig }: { initialConfig: Config }) {
  const router = useRouter();
  const [config, setConfig] = useState<Config>(initialConfig);
  const [pending, startTransition] = useTransition();

  const pages = Object.keys(config.pages);
  const [selectedPage, setSelectedPage] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("dashboardImagesPage");
      if (saved && pages.includes(saved)) return saved;
    }
    return pages[0] ?? "";
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist active page across reloads — saves clicks for the owner
  // when iterating on a single section.
  useEffect(() => {
    if (selectedPage && typeof window !== "undefined") {
      window.localStorage.setItem("dashboardImagesPage", selectedPage);
    }
  }, [selectedPage]);

  // Whenever the server returns a fresh config (after upload / save /
  // delete), keep the local state aligned without losing the
  // selection.
  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig]);

  const currentImages = config.pages[selectedPage] ?? {};
  const imageEntries = Object.entries(currentImages);
  const selectedImage =
    selectedKey && currentImages[selectedKey] ? currentImages[selectedKey] : null;

  function flash(text: string, kind: "ok" | "err" = "ok", ms = 2500) {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), ms);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    if (selectedPage) fd.append("targetPage", selectedPage);
    if (selectedKey) fd.append("targetKey", selectedKey);

    startTransition(async () => {
      setMsg(null);
      const res = await uploadDashboardImage(fd);
      if (e.target) e.target.value = "";
      if (!res.ok) {
        flash(res.error, "err", 4000);
        return;
      }
      flash(selectedKey ? "Image remplacée ✓" : "Image ajoutée ✓");
      router.refresh();
    });
  }

  function patchSlot(patch: Partial<ImageConfig>) {
    if (!selectedKey) return;
    // Optimistic local update so the UI feels live; server action
    // persists in the background. We don't roll back on error — we
    // surface a banner instead so the owner can retry.
    setConfig((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as Config;
      if (!next.pages[selectedPage]) next.pages[selectedPage] = {};
      const current = next.pages[selectedPage][selectedKey] ?? ({} as ImageConfig);
      next.pages[selectedPage][selectedKey] = {
        ...current,
        ...patch,
      } as ImageConfig;
      return next;
    });

    startTransition(async () => {
      const res = await updateImageSlot(selectedPage, selectedKey, patch);
      if (!res.ok) flash(res.error, "err", 5000);
    });
  }

  function handleDelete() {
    if (!selectedImage || !selectedKey) return;
    if (!selectedImage.path?.includes("/api/admin/image-proxy")) {
      flash(
        "Image statique (commitée dans le repo) — impossible à supprimer depuis l'admin.",
        "err",
        4000,
      );
      return;
    }
    if (!window.confirm("Supprimer définitivement cette image ?")) return;

    startTransition(async () => {
      const res = await deleteDashboardImageByProxy(selectedImage.path);
      if (!res.ok) {
        flash(res.error, "err", 4000);
        return;
      }
      setSelectedKey(null);
      flash("Image supprimée ✓");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
      {/* Page navigator */}
      <aside className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Pages
        </p>
        {pages.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-neutral-500">Aucune page configurée.</p>
        ) : (
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {pages.map((page) => {
              const active = selectedPage === page;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => {
                    setSelectedPage(page);
                    setSelectedKey(null);
                  }}
                  className={`text-left rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                    active
                      ? "bg-[color:var(--color-grenat)] text-[color:var(--color-bone)]"
                      : "border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>
        )}
      </aside>

      {/* Two-panel editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold capitalize text-slate-900 dark:text-white">
            {selectedPage || "—"}{" "}
            <span className="text-slate-500 dark:text-neutral-500">
              ({imageEntries.length} image{imageEntries.length > 1 ? "s" : ""})
            </span>
          </h2>
          <button
            type="button"
            onClick={() => router.refresh()}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${pending ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>

        {msg && (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              msg.kind === "ok"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="grid gap-4 lg:h-[calc(100vh-260px)] lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Left: upload zone + image list */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
            <div className="border-b border-slate-100 dark:border-neutral-900 p-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={pending}
                className="hidden"
                id="dashboard-image-input"
              />
              <label
                htmlFor="dashboard-image-input"
                className={`block cursor-pointer rounded-md border-2 border-dashed border-[color:var(--color-grenat)]/60 bg-slate-100 dark:bg-neutral-900 p-3 text-center transition-colors ${
                  pending ? "opacity-50" : "hover:bg-slate-200 dark:hover:bg-neutral-800"
                }`}
              >
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {pending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {selectedKey ? "Remplacer l'image" : "Importer"}
                </p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-400">
                  {selectedKey
                    ? `Slot : ${selectedKey}`
                    : "Sera ajoutée à la galerie événements"}
                </p>
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {imageEntries.length === 0 ? (
                <p className="p-4 text-center text-xs text-slate-500 dark:text-neutral-500">
                  Aucune image
                </p>
              ) : (
                <ul className="space-y-1">
                  {imageEntries.map(([key, image]) => {
                    const active = selectedKey === key;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => setSelectedKey(key)}
                          className={`flex w-full gap-3 rounded-md p-2 text-left transition-colors ${
                            active
                              ? "border-2 border-[color:var(--color-grenat)] bg-slate-100 dark:bg-neutral-900"
                              : "border-2 border-transparent bg-slate-100 dark:bg-neutral-900/50 hover:bg-slate-100 dark:hover:bg-neutral-900"
                          }`}
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded bg-slate-200 dark:bg-neutral-800">
                            {image.path ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={image.path}
                                alt={image.title}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                              {image.title}
                            </p>
                            <p className="truncate text-[11px] text-slate-500 dark:text-neutral-500">
                              {image.label || "Événement"}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* Right: detail panel */}
          <section className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
            {selectedImage && selectedKey ? (
              <DetailPanel
                image={selectedImage}
                slotKey={selectedKey}
                onPatch={patchSlot}
                onDelete={handleDelete}
                pending={pending}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="text-sm text-slate-600 dark:text-neutral-400">
                  👈 Sélectionne une image
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-neutral-600">
                  pour modifier titre, format, label
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

/* ─── Detail panel ─────────────────────────────────────────────── */

function DetailPanel({
  image,
  slotKey,
  onPatch,
  onDelete,
  pending,
}: {
  image: ImageConfig;
  slotKey: string;
  onPatch: (patch: Partial<ImageConfig>) => void;
  onDelete: () => void;
  pending: boolean;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(image.title);
  useEffect(() => {
    setDraftTitle(image.title);
    setEditingTitle(false);
  }, [slotKey, image.title]);

  const aspectRatio =
    image.orientation === "portrait"
      ? "3/4"
      : image.orientation === "landscape"
        ? "16/9"
        : "1/1";

  return (
    <div className="space-y-5 p-5">
      {/* Preview */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Aperçu
        </h3>
        <div
          className="w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-neutral-900"
          style={{ aspectRatio }}
        >
          {image.path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.path}
              alt={image.title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Titre
        </h3>
        {editingTitle ? (
          <div className="space-y-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              autoFocus
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-none focus:border-[color:var(--color-grenat)] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (draftTitle.trim()) {
                    onPatch({ title: draftTitle.trim() });
                    setEditingTitle(false);
                  }
                }}
                disabled={pending}
                className="inline-flex items-center justify-center gap-1 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <Check className="h-3 w-3" /> Valider
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftTitle(image.title);
                  setEditingTitle(false);
                }}
                disabled={pending}
                className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 text-left text-sm text-slate-900 dark:text-white transition-colors hover:border-slate-300 dark:hover:border-neutral-700"
          >
            {image.title} <span className="text-slate-500 dark:text-neutral-500">✏️</span>
          </button>
        )}
      </div>

      {/* Label */}
      <div className="space-y-2 rounded-lg border border-[color:var(--color-grenat)]/40 bg-[color:var(--color-grenat)]/10 p-3">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--color-grenat-glow)]">
          🏷 Tag de l&apos;image
        </h3>
        <select
          value={image.label || "Événement"}
          onChange={(e) => onPatch({ label: e.target.value })}
          disabled={pending}
          className="w-full rounded-md border border-[color:var(--color-grenat)]/40 bg-slate-100 dark:bg-neutral-900 px-3 py-2 text-sm font-semibold text-[color:var(--color-grenat-glow)] focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-50"
        >
          {LABEL_OPTIONS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Orientation */}
      <div className="space-y-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
          Format
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {ORIENTATIONS.map((o) => {
            const active = image.orientation === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onPatch({ orientation: o.value })}
                disabled={pending}
                className={`rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-[color:var(--color-grenat)] text-[color:var(--color-bone)]"
                    : "border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700"
                }`}
              >
                <span className="block text-base leading-none">{o.glyph}</span>
                <span className="mt-1 block text-[10px] capitalize">
                  {o.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete */}
      <div className="border-t border-slate-200 dark:border-neutral-800 pt-4">
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-4 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" /> Supprimer
        </button>
      </div>
    </div>
  );
}
