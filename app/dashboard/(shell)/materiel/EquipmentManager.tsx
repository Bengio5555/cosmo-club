"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, QrCode, Trash2, X } from "lucide-react";
import {
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_CATEGORY_LABEL,
  type EquipmentCategory,
} from "@/lib/equipment/shared";
import {
  createEquipment,
  deleteEquipment,
  setEquipmentArchived,
  updateEquipment,
} from "./actions";

export type EquipmentRow = {
  id: string;
  code: string;
  name: string;
  category: EquipmentCategory;
  contents: string | null;
  qr_token: string;
  archived: boolean;
  created_at: string;
  /** Number of events this element has been assigned to. */
  events: number;
  /** QR as a data URI, rendered server-side. */
  qr: string;
};

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

export function EquipmentManager({ rows, activeCount }: { rows: EquipmentRow[]; activeCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(rows.length === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const visible = rows.filter((r) => showArchived || !r.archived);
  const archivedCount = rows.length - activeCount;

  function handleCreate(form: FormData) {
    setErr(null);
    startTransition(async () => {
      const res = await createEquipment({
        code: String(form.get("code") || ""),
        name: String(form.get("name") || ""),
        category: String(form.get("category") || "autre") as EquipmentCategory,
        contents: String(form.get("contents") || ""),
      });
      if (!res.ok) return setErr(res.error);
      setAdding(false);
      router.refresh();
    });
  }

  function handleUpdate(id: string, form: FormData) {
    setErr(null);
    startTransition(async () => {
      const res = await updateEquipment(id, {
        code: String(form.get("code") || ""),
        name: String(form.get("name") || ""),
        category: String(form.get("category") || "autre") as EquipmentCategory,
        contents: String(form.get("contents") || ""),
      });
      if (!res.ok) return setErr(res.error);
      setEditing(null);
      router.refresh();
    });
  }

  function toggleArchive(row: EquipmentRow) {
    setErr(null);
    startTransition(async () => {
      const res = await setEquipmentArchived(row.id, !row.archived);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function remove(row: EquipmentRow) {
    if (!window.confirm(`Supprimer ${row.code} · ${row.name} ? L'étiquette imprimée ne fonctionnera plus.`)) return;
    setErr(null);
    startTransition(async () => {
      const res = await deleteEquipment(row.id);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-white">{activeCount}</strong> élément{activeCount > 1 ? "s" : ""} actif{activeCount > 1 ? "s" : ""}
          {archivedCount > 0 && (
            <>
              {" · "}
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
              >
                {showArchived ? "masquer" : "voir"} {archivedCount} archivé{archivedCount > 1 ? "s" : ""}
              </button>
            </>
          )}
        </p>
        {!adding && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setAdding(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-900 transition-colors hover:bg-slate-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvel élément
          </button>
        )}
      </div>

      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {err}
        </div>
      )}

      {adding && (
        <EquipmentForm
          title="Nouvel élément"
          submitLabel="Créer"
          pending={pending}
          onCancel={() => setAdding(false)}
          onSubmit={handleCreate}
        />
      )}

      {visible.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
          Aucun élément pour l&apos;instant. Commence par le bar et tes caisses.
        </div>
      )}

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((row) =>
          editing === row.id ? (
            <li key={row.id} className="md:col-span-2 xl:col-span-3">
              <EquipmentForm
                title={`Modifier ${row.code}`}
                submitLabel="Enregistrer"
                initial={row}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSubmit={(form) => handleUpdate(row.id, form)}
              />
            </li>
          ) : (
            <li
              key={row.id}
              className={`flex gap-3 rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950/60 dark:shadow-none ${row.archived ? "border-dashed border-slate-300 opacity-60 dark:border-slate-700" : "border-slate-200 dark:border-slate-800"}`}
            >
              <Link
                href={`/dashboard/materiel/etiquettes?ids=${row.id}`}
                title="Imprimer cette étiquette"
                className="h-20 w-20 shrink-0 rounded-md bg-white p-1 ring-1 ring-slate-200 dark:ring-slate-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.qr} alt={`QR ${row.code}`} className="h-full w-full" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] font-semibold tracking-wide text-[color:var(--color-grenat)]">
                      {row.code}
                    </p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.name}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {EQUIPMENT_CATEGORY_LABEL[row.category]}
                  </span>
                </div>
                {row.contents && (
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600 dark:text-slate-400">{row.contents}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-500">
                  <span>{row.events} événement{row.events > 1 ? "s" : ""}</span>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditing(row.id);
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Pencil className="h-3 w-3" /> modifier
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => toggleArchive(row)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white"
                  >
                    {row.archived ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                    {row.archived ? "réactiver" : "archiver"}
                  </button>
                  {row.events === 0 && (
                    <>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 text-red-700 hover:text-red-900 dark:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" /> supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </li>
          ),
        )}
      </ul>

      {rows.length > 0 && (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-500">
          <QrCode className="h-3.5 w-3.5" />
          Clique un QR pour imprimer son étiquette seule, ou « Imprimer les étiquettes » pour toute la planche.
        </p>
      )}
    </div>
  );
}

function EquipmentForm({
  title,
  submitLabel,
  initial,
  pending,
  onCancel,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  initial?: Pick<EquipmentRow, "code" | "name" | "category" | "contents">;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <form
      action={onSubmit}
      className="space-y-3 rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:shadow-none"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
        <button type="button" onClick={onCancel} className="text-slate-500 hover:text-slate-900 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-[140px_minmax(0,1fr)_150px]">
        <Field label="Code (sur l'étiquette)">
          <input
            name="code"
            required
            defaultValue={initial?.code ?? ""}
            placeholder="CAISSE-07"
            autoCapitalize="characters"
            className={`${inputCls} font-mono uppercase`}
          />
        </Field>
        <Field label="Nom">
          <input
            name="name"
            required
            defaultValue={initial?.name ?? ""}
            placeholder="Caisse verrerie highball"
            className={inputCls}
          />
        </Field>
        <Field label="Catégorie">
          <select name="category" defaultValue={initial?.category ?? "caisse"} className={inputCls}>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EQUIPMENT_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Contenu (ce que le manutentionnaire doit y trouver)">
        <textarea
          name="contents"
          rows={2}
          defaultValue={initial?.contents ?? ""}
          placeholder="24 verres highball · 2 shakers · 1 passoire"
          className={inputCls}
        />
      </Field>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-600 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          {pending && <Loader2 className="h-3 w-3 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
