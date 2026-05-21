"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, Trash2, X, Loader2, Pencil } from "lucide-react";
import type { Tables } from "@/types/database";
import { formatEUR } from "@/lib/format";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "./actions";

type CatalogItem = Tables<"catalog_items">;

const SUGGESTED_SECTIONS = [
  "Bar à cocktails",
  "Barista",
  "Logistique",
  "Scénographie",
  "Équipe",
];

type DraftInput = {
  title: string;
  section: string;
  unit: string;
  unit_price_ht: string;
  description: string;
};

const emptyDraft = (section = ""): DraftInput => ({
  title: "",
  section,
  unit: "unité",
  unit_price_ht: "",
  description: "",
});

export function CatalogManager({ initial }: { initial: CatalogItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);

  // Group by section (unlabelled → "Autres")
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const it of initial) {
      const key = it.section ?? "Autres";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    const knownFirst = SUGGESTED_SECTIONS.filter((s) => map.has(s)).map(
      (s) => [s, map.get(s)!] as const,
    );
    const others = [...map.entries()].filter(
      ([s]) => !SUGGESTED_SECTIONS.includes(s),
    );
    return [...knownFirst, ...others];
  }, [initial]);

  const knownSectionNames = useMemo(() => {
    const s = new Set<string>(SUGGESTED_SECTIONS);
    for (const it of initial) if (it.section) s.add(it.section);
    return [...s];
  }, [initial]);

  function flash(m: { kind: "ok" | "err"; text: string }) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  function saveNew(draft: DraftInput, forSection: string | null) {
    if (!draft.title.trim()) return flash({ kind: "err", text: "Titre requis" });
    startTransition(async () => {
      const res = await createCatalogItem({
        title: draft.title,
        section: (forSection ?? draft.section) || null,
        unit: draft.unit || "unité",
        unit_price_ht: Number(draft.unit_price_ht) || 0,
        description: draft.description,
      });
      if (!res.ok) return flash({ kind: "err", text: res.error });
      setAdding(null);
      flash({ kind: "ok", text: "Ajouté" });
      router.refresh();
    });
  }

  function saveEdit(id: string, draft: DraftInput) {
    if (!draft.title.trim()) return flash({ kind: "err", text: "Titre requis" });
    startTransition(async () => {
      const res = await updateCatalogItem(id, {
        title: draft.title,
        section: draft.section || null,
        unit: draft.unit || "unité",
        unit_price_ht: Number(draft.unit_price_ht) || 0,
        description: draft.description,
      });
      if (!res.ok) return flash({ kind: "err", text: res.error });
      setEditingId(null);
      flash({ kind: "ok", text: "Enregistré" });
      router.refresh();
    });
  }

  function remove(id: string, title: string) {
    if (!window.confirm(`Supprimer « ${title} » du catalogue ?`)) return;
    startTransition(async () => {
      const res = await deleteCatalogItem(id);
      if (!res.ok) return flash({ kind: "err", text: res.error });
      flash({ kind: "ok", text: "Supprimé" });
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 dark:text-slate-500">
          {initial.length} prestation{initial.length > 1 ? "s" : ""} actives
        </p>
        <button
          type="button"
          onClick={() => setAdding("__new__")}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <Plus className="h-3 w-3" /> Nouvelle prestation
        </button>
      </div>

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

      {adding === "__new__" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Nouvelle prestation
          </p>
          <DraftForm
            initial={emptyDraft()}
            knownSections={knownSectionNames}
            pending={pending}
            onCancel={() => setAdding(null)}
            onSave={(d) => saveNew(d, null)}
            saveLabel="Créer"
          />
        </div>
      )}

      {initial.length === 0 && adding !== "__new__" && (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">Aucune prestation pour l&apos;instant.</p>
          <button
            type="button"
            onClick={() => setAdding("__new__")}
            className="mt-3 text-xs text-slate-600 dark:text-slate-300 underline"
          >
            Créer la première
          </button>
        </div>
      )}

      {grouped.map(([sectionName, sectionItems]) => (
        <section key={sectionName} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
          <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
              {sectionName}
            </p>
            <button
              type="button"
              onClick={() => setAdding(sectionName)}
              className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
            >
              <Plus className="h-3 w-3" /> ligne
            </button>
          </header>

          <ul className="divide-y divide-slate-100 dark:divide-slate-900">
            {sectionItems.map((it) =>
              editingId === it.id ? (
                <li key={it.id} className="p-4">
                  <DraftForm
                    initial={{
                      title: it.title,
                      section: it.section ?? "",
                      unit: it.unit ?? "unité",
                      unit_price_ht: String(it.unit_price_ht ?? 0),
                      description: it.description ?? "",
                    }}
                    knownSections={knownSectionNames}
                    pending={pending}
                    onCancel={() => setEditingId(null)}
                    onSave={(d) => saveEdit(it.id, d)}
                    saveLabel="Enregistrer"
                  />
                </li>
              ) : (
                <li
                  key={it.id}
                  className="flex items-start justify-between gap-4 px-4 py-3 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">{it.title}</p>
                    {it.description && (
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {it.description}
                      </p>
                    )}
                  </div>
                  <div className="hidden w-24 text-right text-xs text-slate-500 dark:text-slate-500 md:block">
                    {it.unit ?? "unité"}
                  </div>
                  <div className="w-24 text-right">
                    <span className="font-medium text-slate-900 dark:text-white">
                      {formatEUR(it.unit_price_ht ?? 0)}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingId(it.id)}
                      className="rounded p-1.5 text-slate-500 dark:text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                      aria-label="Éditer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(it.id, it.title)}
                      className="rounded p-1.5 text-slate-500 dark:text-slate-500 transition-colors hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>

          {adding === sectionName && (
            <div className="border-t border-slate-100 dark:border-slate-900 p-4">
              <DraftForm
                initial={emptyDraft(sectionName)}
                knownSections={knownSectionNames}
                pending={pending}
                onCancel={() => setAdding(null)}
                onSave={(d) => saveNew(d, sectionName)}
                saveLabel="Ajouter"
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

/* ─── DraftForm ──────────────────────────────────────────────────── */

function DraftForm({
  initial,
  knownSections,
  pending,
  onCancel,
  onSave,
  saveLabel,
}: {
  initial: DraftInput;
  knownSections: string[];
  pending: boolean;
  onCancel: () => void;
  onSave: (d: DraftInput) => void;
  saveLabel: string;
}) {
  const [d, setD] = useState<DraftInput>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(d);
      }}
      className="space-y-3"
    >
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,200px)]">
        <Input
          value={d.title}
          onChange={(v) => setD({ ...d, title: v })}
          placeholder="Titre (ex: Cosmopolitan givré or)"
          autoFocus
        />
        <Select
          value={d.section}
          onChange={(v) => setD({ ...d, section: v })}
          options={[
            { value: "", label: "Sans section" },
            ...knownSections.map((s) => ({ value: s, label: s })),
          ]}
          extra={
            <Input
              value={d.section}
              onChange={(v) => setD({ ...d, section: v })}
              placeholder="ou tape une nouvelle"
              small
            />
          }
        />
      </div>

      <Textarea
        value={d.description}
        onChange={(v) => setD({ ...d, description: v })}
        placeholder="Description (optionnelle)"
        rows={2}
      />

      <div className="grid gap-2 md:grid-cols-[minmax(0,120px)_minmax(0,160px)]">
        <Input
          value={d.unit}
          onChange={(v) => setD({ ...d, unit: v })}
          placeholder="unité"
        />
        <Input
          value={d.unit_price_ht}
          onChange={(v) => setD({ ...d, unit_price_ht: v })}
          type="number"
          step="0.01"
          placeholder="Prix HT"
          rightAdornment="€ HT"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
        >
          <X className="h-3 w-3" /> Annuler
        </button>
      </div>
    </form>
  );
}

/* ─── Small primitives ──────────────────────────────────────────── */

function Input(props: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  autoFocus?: boolean;
  small?: boolean;
  rightAdornment?: string;
}) {
  return (
    <div className="relative">
      <input
        type={props.type ?? "text"}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        autoFocus={props.autoFocus}
        className={`w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none ${
          props.small ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        } ${props.rightAdornment ? "pr-12" : ""}`}
      />
      {props.rightAdornment && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
          {props.rightAdornment}
        </span>
      )}
    </div>
  );
}

function Select(props: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  extra?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <select
        value={props.options.some((o) => o.value === props.value) ? props.value : ""}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-[color:var(--color-grenat)] focus:outline-none"
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {props.extra}
    </div>
  );
}

function Textarea(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      rows={props.rows ?? 2}
      className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
    />
  );
}
