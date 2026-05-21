"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  deleteStaff,
  saveNewStaff,
  saveStaff,
  toggleStaffArchived,
  type StaffInput,
} from "./actions";

type Staff = Tables<"staff">;
type StaffRole = Database["public"]["Enums"]["staff_role"];

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "barman", label: "Barman" },
  { value: "barista", label: "Barista" },
  { value: "runner", label: "Runner" },
  { value: "chef_de_salle", label: "Chef de salle" },
  { value: "autre", label: "Autre" },
];

const ROLE_LABEL: Record<StaffRole, string> = Object.fromEntries(
  ROLE_OPTIONS.map((r) => [r.value, r.label]),
) as Record<StaffRole, string>;

export function StaffTable({ staff }: { staff: Staff[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<"new" | { edit: Staff } | null>(null);

  // ─── Search + role filter ───────────────────────────────
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<StaffRole | "all">("all");
  const normalized = search.trim().toLowerCase();

  const visibleStaff = useMemo(() => {
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (!normalized) return true;
      const haystack = [
        s.full_name,
        s.email ?? "",
        s.phone ?? "",
        ROLE_LABEL[s.role],
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [staff, roleFilter, normalized]);

  const active = visibleStaff.filter((s) => !s.archived);
  const archived = visibleStaff.filter((s) => s.archived);

  // Counts per role (on full list, not filtered) for the pill badges.
  const countByRole = useMemo(() => {
    const m: Record<string, number> = { all: staff.length };
    for (const s of staff) m[s.role] = (m[s.role] ?? 0) + 1;
    return m;
  }, [staff]);

  function submitNew(form: FormData) {
    setErr(null);
    const input: StaffInput = {
      full_name: String(form.get("full_name") || ""),
      role: (form.get("role") as StaffRole) || "barman",
      hourly_rate: form.get("hourly_rate")
        ? Number(form.get("hourly_rate"))
        : null,
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      notes: String(form.get("notes") || ""),
    };
    startTransition(async () => {
      const res = await saveNewStaff(input);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setModal(null);
      router.refresh();
    });
  }

  function submitEdit(id: string, form: FormData) {
    setErr(null);
    const patch: Partial<StaffInput> = {
      full_name: String(form.get("full_name") || ""),
      role: form.get("role") as StaffRole,
      hourly_rate: form.get("hourly_rate")
        ? Number(form.get("hourly_rate"))
        : null,
      email: String(form.get("email") || ""),
      phone: String(form.get("phone") || ""),
      notes: String(form.get("notes") || ""),
    };
    startTransition(async () => {
      const res = await saveStaff(id, patch);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setModal(null);
      router.refresh();
    });
  }

  function toggleArchive(id: string, currentlyArchived: boolean) {
    startTransition(async () => {
      const res = await toggleStaffArchived(id, !currentlyArchived);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function doDelete(s: Staff) {
    if (
      !window.confirm(
        `Supprimer définitivement ${s.full_name} ?\nCette action est irréversible. (Si ${s.full_name} est lié à des événements passés, archive plutôt.)`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      setErr(null);
      const res = await deleteStaff(s.id);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-slate-500 dark:text-neutral-500">
          {active.length} actif{active.length > 1 ? "s" : ""}
          {archived.length > 0 && ` · ${archived.length} archivé${archived.length > 1 ? "s" : ""}`}
          {(roleFilter !== "all" || normalized) && staff.length > 0 && (
            <span className="ml-1 text-slate-400 dark:text-neutral-600">
              · sur {staff.length} au total
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-neutral-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un membre…"
              className="w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 py-2 pl-8 pr-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none md:w-64"
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

      {/* Role filter pills */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {(
          [
            { value: "all" as const, label: "Tous" },
            ...ROLE_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
          ]
        ).map((opt) => {
          const isActive = roleFilter === opt.value;
          const count = countByRole[opt.value] ?? 0;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRoleFilter(opt.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                isActive
                  ? "border-[color:var(--color-grenat)] bg-[color:var(--color-grenat)]/15 text-slate-900 dark:text-white"
                  : "border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900 text-slate-500 dark:text-neutral-400 hover:border-slate-300 dark:hover:border-neutral-700 hover:text-neutral-200"
              }`}
            >
              {opt.label}
              <span
                className={`rounded-full px-1.5 text-[10px] font-mono ${
                  isActive ? "bg-[color:var(--color-grenat)]/30" : "bg-slate-200 dark:bg-neutral-800"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {err}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none">
        {staff.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-500">
            Aucun membre d&apos;équipe. Clique « Ajouter » pour commencer.
          </div>
        ) : visibleStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-neutral-500">
            Aucun membre ne correspond
            {normalized ? <> à « <span className="text-slate-600 dark:text-neutral-300">{search}</span> »</> : null}
            {roleFilter !== "all"
              ? <> dans la catégorie <span className="text-slate-600 dark:text-neutral-300">{ROLE_LABEL[roleFilter]}</span></>
              : null}
            .
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-neutral-800 dark:bg-transparent dark:text-neutral-500">
              <tr>
                <th className="px-3 py-2.5 font-medium md:px-4">Nom</th>
                <th className="px-3 py-2.5 font-medium md:px-4">Rôle</th>
                <th className="hidden px-3 py-2.5 font-medium md:table-cell md:px-4">Contact</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Taux h.</th>
                <th className="px-3 py-2.5 text-right font-medium md:px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...active, ...archived].map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-neutral-900 dark:hover:bg-neutral-900 ${s.archived ? "opacity-50" : ""}`}
                >
                  <td className="px-3 py-3 md:px-4">
                    <p className="font-medium text-slate-900 dark:text-white">{s.full_name}</p>
                    {s.notes && (
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-neutral-500 line-clamp-1">
                        {s.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 md:px-4">
                    <span className="inline-flex rounded-full border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600 dark:text-neutral-300">
                      {ROLE_LABEL[s.role]}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-xs text-slate-600 dark:text-neutral-300 md:table-cell md:px-4">
                    {s.email && <div>{s.email}</div>}
                    {s.phone && <div className="text-slate-500 dark:text-neutral-500">{s.phone}</div>}
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-slate-700 dark:text-neutral-200 md:px-4">
                    {s.hourly_rate != null
                      ? `${Number(s.hourly_rate).toFixed(2)} €`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right md:px-4">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setModal({ edit: s })}
                        disabled={pending}
                        className="rounded p-1.5 text-slate-500 dark:text-neutral-400 transition-colors hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-slate-900 dark:hover:text-white"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleArchive(s.id, s.archived)}
                        disabled={pending}
                        className="rounded p-1.5 text-slate-500 dark:text-neutral-500 transition-colors hover:bg-slate-200 dark:hover:bg-neutral-800 hover:text-neutral-200"
                        aria-label={s.archived ? "Désarchiver" : "Archiver"}
                        title={s.archived ? "Désarchiver" : "Archiver"}
                      >
                        {s.archived ? (
                          <ArchiveRestore className="h-3.5 w-3.5" />
                        ) : (
                          <Archive className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => doDelete(s)}
                        disabled={pending}
                        className="rounded p-1.5 text-slate-500 dark:text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        aria-label="Supprimer"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal
          staff={typeof modal === "object" ? modal.edit : null}
          pending={pending}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={(form) =>
            typeof modal === "object" ? submitEdit(modal.edit.id, form) : submitNew(form)
          }
        />
      )}
    </>
  );
}

function Modal({
  staff,
  pending,
  onClose,
  onSubmit,
}: {
  staff: Staff | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  const isEdit = !!staff;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
              {isEdit ? "Modifier" : "Nouveau"}
            </p>
            <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
              {isEdit ? staff!.full_name : "Membre d'équipe"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 dark:text-neutral-500 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-900 dark:hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-3">
          <Field label="Nom complet">
            <input
              name="full_name"
              required
              defaultValue={staff?.full_name ?? ""}
              autoFocus
              className={inputCls}
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Rôle">
              <select
                name="role"
                defaultValue={staff?.role ?? "barman"}
                className={inputCls}
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Taux horaire (€)">
              <input
                type="number"
                step="0.5"
                min="0"
                name="hourly_rate"
                defaultValue={staff?.hourly_rate ?? ""}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Email">
              <input
                type="email"
                name="email"
                defaultValue={staff?.email ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Téléphone">
              <input
                name="phone"
                defaultValue={staff?.phone ?? ""}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Notes internes">
            <textarea
              name="notes"
              rows={2}
              defaultValue={staff?.notes ?? ""}
              className={inputCls}
            />
          </Field>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-neutral-900 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-2 text-xs text-slate-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
