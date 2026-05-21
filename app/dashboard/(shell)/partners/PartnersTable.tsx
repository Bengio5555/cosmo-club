"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import type { Tables } from "@/types/database";
import {
  deletePartner,
  saveNewPartner,
  savePartner,
  togglePartnerArchived,
  type PartnerInput,
} from "./actions";

type Partner = Tables<"partners">;

export function PartnersTable({ partners }: { partners: Partner[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | { edit: Partner } | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const p of partners) s.add(p.category);
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [partners]);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = { all: partners.length };
    for (const p of partners) m[p.category] = (m[p.category] ?? 0) + 1;
    return m;
  }, [partners]);

  const normalized = search.trim().toLowerCase();
  const visible = useMemo(() => {
    return partners.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!normalized) return true;
      const haystack = [
        p.name,
        p.contact_name ?? "",
        p.position ?? "",
        p.email ?? "",
        p.email_alt ?? "",
        p.phone ?? "",
        p.category,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [partners, cat, normalized]);

  const grouped = useMemo(() => {
    const m = new Map<string, Partner[]>();
    for (const p of visible) {
      if (p.archived) continue;
      const arr = m.get(p.category) ?? [];
      arr.push(p);
      m.set(p.category, arr);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [visible]);
  const archived = visible.filter((p) => p.archived);

  function submitNew(form: FormData) {
    setErr(null);
    const input = formToInput(form);
    startTransition(async () => {
      const res = await saveNewPartner(input);
      if (!res.ok) return setErr(res.error);
      setModal(null);
      router.refresh();
    });
  }

  function submitEdit(id: string, form: FormData) {
    setErr(null);
    const input = formToInput(form);
    startTransition(async () => {
      const res = await savePartner(id, input);
      if (!res.ok) return setErr(res.error);
      setModal(null);
      router.refresh();
    });
  }

  function toggleArchive(id: string, archivedNow: boolean) {
    startTransition(async () => {
      const res = await togglePartnerArchived(id, !archivedNow);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function doDelete(p: Partner) {
    if (!window.confirm(`Supprimer définitivement ${p.name} ?`)) return;
    startTransition(async () => {
      setErr(null);
      const res = await deletePartner(p.id);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500 dark:text-neutral-500">
          {visible.filter((p) => !p.archived).length} contact(s) actif(s)
          {archived.length > 0 && ` · ${archived.length} archivé(s)`}
          {(cat !== "all" || normalized) && partners.length > 0 && (
            <span className="ml-1 text-neutral-600"> · sur {partners.length} au total</span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, société, contact, email…"
              className="w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 py-2 pl-8 pr-2.5 text-xs text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none md:w-72"
            />
          </div>
          <button
            type="button"
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)]"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <CatPill label="Tous" value="all" current={cat} onClick={setCat} count={countByCat.all ?? 0} />
        {categories.map((c) => (
          <CatPill key={c} label={c} value={c} current={cat} onClick={setCat} count={countByCat[c] ?? 0} />
        ))}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {err}
        </div>
      )}

      <div className="space-y-4">
        {partners.length === 0 ? (
          <Empty>Aucun partenaire pour l&apos;instant. Clique « Ajouter ».</Empty>
        ) : grouped.length === 0 && archived.length === 0 ? (
          <Empty>Aucun résultat.</Empty>
        ) : (
          grouped.map(([catName, list]) => (
            <div key={catName} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
              <div className="border-b border-neutral-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {catName} · {list.length}
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-neutral-900">
                {list.map((p) => (
                  <PartnerRow
                    key={p.id}
                    p={p}
                    pending={pending}
                    onEdit={() => setModal({ edit: p })}
                    onArchive={() => toggleArchive(p.id, p.archived)}
                    onDelete={() => doDelete(p)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}

        {archived.length > 0 && (
          <details className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
            <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-300">
              Archivés · {archived.length}
            </summary>
            <ul className="divide-y divide-slate-100 dark:divide-neutral-900">
              {archived.map((p) => (
                <PartnerRow
                  key={p.id}
                  p={p}
                  pending={pending}
                  onEdit={() => setModal({ edit: p })}
                  onArchive={() => toggleArchive(p.id, p.archived)}
                  onDelete={() => doDelete(p)}
                />
              ))}
            </ul>
          </details>
        )}
      </div>

      {modal === "new" && (
        <PartnerModal
          partner={null}
          pending={pending}
          categories={categories}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={submitNew}
        />
      )}
      {modal && typeof modal === "object" && (
        <PartnerModal
          partner={modal.edit}
          pending={pending}
          categories={categories}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={(form) => submitEdit(modal.edit.id, form)}
        />
      )}
    </>
  );
}

function PartnerRow({
  p,
  pending,
  onEdit,
  onArchive,
  onDelete,
}: {
  p: Partner;
  pending: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={`flex flex-col gap-2 px-4 py-3 ${p.archived ? "opacity-50" : ""} md:flex-row md:items-center md:gap-3`}>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-white">{p.name}</p>
        <p className="text-[11px] text-slate-500 dark:text-neutral-500">
          {p.contact_name}
          {p.contact_name && p.position ? " · " : ""}
          {p.position}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {p.email && (
          <a
            href={`mailto:${p.email}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2 py-1 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
          >
            <Mail className="h-3 w-3" /> {p.email}
          </a>
        )}
        {p.email_alt && (
          <a
            href={`mailto:${p.email_alt}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2 py-1 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
            title="Email secondaire"
          >
            <Mail className="h-3 w-3 opacity-60" /> {p.email_alt}
          </a>
        )}
        {p.phone && (
          <a
            href={`tel:${p.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2 py-1 text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-neutral-300 dark:hover:border-neutral-700 dark:hover:text-white"
          >
            <Phone className="h-3 w-3" /> {p.phone}
          </a>
        )}
        <button type="button" onClick={onEdit} disabled={pending} className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white" aria-label="Modifier">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onArchive} disabled={pending} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200" aria-label={p.archived ? "Désarchiver" : "Archiver"} title={p.archived ? "Désarchiver" : "Archiver"}>
          {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        <button type="button" onClick={onDelete} disabled={pending} className="rounded p-1.5 text-neutral-500 hover:bg-red-500/10 hover:text-red-300" aria-label="Supprimer" title="Supprimer définitivement">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

function CatPill({
  label,
  value,
  current,
  onClick,
  count,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (v: string) => void;
  count: number;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)]/15 text-white"
          : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 text-[10px] font-mono ${
          active ? "bg-[color:var(--color-grenat)]/30" : "bg-neutral-800"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-8 text-center text-sm text-slate-500 dark:text-neutral-500">
      {children}
    </div>
  );
}

function formToInput(form: FormData): PartnerInput {
  return {
    category: String(form.get("category") || ""),
    name: String(form.get("name") || ""),
    contact_name: String(form.get("contact_name") || "") || null,
    position: String(form.get("position") || "") || null,
    email: String(form.get("email") || "") || null,
    email_alt: String(form.get("email_alt") || "") || null,
    phone: String(form.get("phone") || "") || null,
    notes: String(form.get("notes") || "") || null,
  };
}

function PartnerModal({
  partner,
  pending,
  categories,
  onClose,
  onSubmit,
}: {
  partner: Partner | null;
  pending: boolean;
  categories: string[];
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  const isEdit = !!partner;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              {isEdit ? "Modifier" : "Nouveau"}
            </p>
            <h2 className="mt-1 font-display text-lg text-white">
              {isEdit ? partner!.name : "Partenaire"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-neutral-500 hover:bg-neutral-900 hover:text-white" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Catégorie">
              <input
                name="category"
                required
                defaultValue={partner?.category ?? ""}
                list="partner-cats"
                placeholder="Ex: Wedding planner"
                className={input}
              />
              <datalist id="partner-cats">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field label="Nom (société / contact)">
              <input name="name" required defaultValue={partner?.name ?? ""} className={input} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Nom du contact">
              <input name="contact_name" defaultValue={partner?.contact_name ?? ""} className={input} />
            </Field>
            <Field label="Poste">
              <input name="position" defaultValue={partner?.position ?? ""} placeholder="CEO, Chef de Projet…" className={input} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" defaultValue={partner?.email ?? ""} className={input} />
            </Field>
            <Field label="Email secondaire">
              <input name="email_alt" type="email" defaultValue={partner?.email_alt ?? ""} className={input} />
            </Field>
          </div>

          <Field label="Téléphone">
            <input name="phone" defaultValue={partner?.phone ?? ""} className={input} />
          </Field>

          <Field label="Notes internes">
            <textarea name="notes" defaultValue={partner?.notes ?? ""} rows={2} className={input} />
          </Field>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-neutral-900 pt-4">
            <button type="button" onClick={onClose} disabled={pending} className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-700">
              Annuler
            </button>
            <button type="submit" disabled={pending} className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60">
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const input =
  "w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2.5 py-1.5 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
