"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trash2,
  Upload,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { uploadClientLogo, deleteClientLogo, moveClientLogo } from "./actions";

type Logo = {
  id: string;
  name: string;
  proxyUrl: string;
};

export function LogosManager({ logos }: { logos: Logo[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !file) {
      setMsg({ kind: "err", text: "Indique un nom et choisis un fichier." });
      return;
    }
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("file", file);
    startTransition(async () => {
      setMsg(null);
      const res = await uploadClientLogo(fd);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setName("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMsg({ kind: "ok", text: "Logo ajouté ✓" });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  function remove(id: string, n: string) {
    if (!window.confirm(`Supprimer le logo "${n}" ?`)) return;
    startTransition(async () => {
      const res = await deleteClientLogo(id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function move(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const res = await moveClientLogo(id, direction);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* Upload form */}
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-5"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Ajouter un logo
        </p>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Nom du client
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex. Chanel"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Fichier
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
          />
          <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-500">
            PNG ou SVG transparent recommandé. 2 Mo max.
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Upload className="h-3 w-3" />
          )}
          Uploader le logo
        </button>

        {msg && (
          <div
            className={`rounded-md border px-3 py-2 text-xs ${
              msg.kind === "ok"
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
                : "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
            }`}
          >
            {msg.text}
          </div>
        )}
      </form>

      {/* Existing logos */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-5">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Logos actuels ({logos.length})
        </p>
        {logos.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucun logo pour le moment. Le marquee public reprend la liste
            de noms par défaut tant qu&apos;aucun logo n&apos;est uploadé.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {logos.map((logo, idx) => (
              <li
                key={logo.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/40 p-4"
              >
                <div className="flex h-20 items-center justify-center rounded-md bg-[color:var(--color-cream)] p-3">
                  {/* Same sizing rule as the public marquee — 48 px tall,
                      object-contain — so the admin preview matches what
                      the visitor will see. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logo.proxyUrl}
                    alt={logo.name}
                    className="h-12 w-auto max-w-[80%] object-contain"
                  />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium text-slate-900 dark:text-white">
                    {logo.name}
                  </p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(logo.id, "up")}
                      disabled={idx === 0 || pending}
                      aria-label="Monter"
                      className="rounded p-1 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(logo.id, "down")}
                      disabled={idx === logos.length - 1 || pending}
                      aria-label="Descendre"
                      className="rounded p-1 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(logo.id, logo.name)}
                      disabled={pending}
                      aria-label="Supprimer"
                      className="rounded p-1 text-red-600 dark:text-red-400 hover:text-red-300 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
