"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  assignStaff,
  removeStaffAssignment,
  updateStaffAssignment,
} from "../actions";

type StaffOption = Pick<
  Tables<"staff">,
  "id" | "full_name" | "role" | "hourly_rate" | "archived"
>;
type Assignment = Tables<"event_staff">;
type EventStatus = Database["public"]["Enums"]["event_status"];
type StaffRole = Database["public"]["Enums"]["staff_role"];

const ROLE_LABEL: Record<StaffRole, string> = {
  barman: "Barman",
  barista: "Barista",
  runner: "Runner",
  chef_de_salle: "Chef de salle",
  autre: "Autre",
};

export function StaffSection({
  eventId,
  eventStatus,
  staffOptions,
  assignments,
}: {
  eventId: string;
  eventStatus: EventStatus;
  staffOptions: StaffOption[];
  assignments: Assignment[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const readOnly = eventStatus === "termine" || eventStatus === "annule";
  const allowHoursDone = eventStatus === "en_cours" || eventStatus === "termine";

  const assignedIds = new Set(assignments.map((a) => a.staff_id));
  const staffById = new Map(staffOptions.map((s) => [s.id, s]));
  const available = staffOptions.filter((s) => !assignedIds.has(s.id));

  function handleAssign(form: FormData) {
    setErr(null);
    const staff_id = String(form.get("staff_id") || "");
    const hours_planned = Number(form.get("hours_planned") || 0);
    const rate_override = form.get("rate_override")
      ? Number(form.get("rate_override"))
      : null;
    const notes = String(form.get("notes") || "") || null;
    if (!staff_id || !hours_planned) {
      setErr("Choisis un membre et renseigne des heures prévues.");
      return;
    }
    startTransition(async () => {
      const res = await assignStaff(
        eventId,
        staff_id,
        hours_planned,
        rate_override,
        notes,
      );
      if (!res.ok) return setErr(res.error);
      setAdding(false);
      router.refresh();
    });
  }

  function patchAssignment(
    staffId: string,
    patch: {
      hours_planned?: number;
      hours_done?: number | null;
      rate_override?: number | null;
      notes?: string | null;
    },
  ) {
    startTransition(async () => {
      const res = await updateStaffAssignment(eventId, staffId, patch);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function remove(staffId: string) {
    if (!window.confirm("Retirer ce membre de l'événement ?")) return;
    startTransition(async () => {
      const res = await removeStaffAssignment(eventId, staffId);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  const totalHoursPlanned = assignments.reduce(
    (s, a) => s + Number(a.hours_planned ?? 0),
    0,
  );
  const totalCost = assignments.reduce((s, a) => {
    const staff = staffById.get(a.staff_id);
    const rate = a.rate_override ?? Number(staff?.hourly_rate ?? 0);
    const hours =
      allowHoursDone && a.hours_done != null
        ? Number(a.hours_done)
        : Number(a.hours_planned ?? 0);
    return s + rate * hours;
  }, 0);

  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Équipe</h2>
          <p className="text-[11px] text-neutral-500">
            {assignments.length} assigné{assignments.length > 1 ? "s" : ""}
            {totalHoursPlanned > 0 && ` · ${totalHoursPlanned}h prévues`}
            {totalCost > 0 && ` · ${totalCost.toFixed(2)} € paie estimée`}
          </p>
        </div>
        {!readOnly && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={pending || available.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
          >
            <UserPlus className="h-3 w-3" /> Assigner
          </button>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {err}
        </div>
      )}

      {staffOptions.length === 0 && (
        <div className="rounded-md border border-neutral-800 bg-neutral-900/60 p-3 text-xs text-neutral-400">
          Aucun membre d&apos;équipe dans la base.{" "}
          <Link
            href="/dashboard/staff"
            className="text-neutral-200 underline decoration-dotted underline-offset-2 hover:text-white"
          >
            Ajoute d&apos;abord tes barmen / baristas →
          </Link>
        </div>
      )}

      {adding && staffOptions.length > 0 && (
        <form
          action={handleAssign}
          className="mb-3 space-y-2 rounded-md border border-neutral-800 bg-neutral-900/60 p-3"
        >
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_80px_100px]">
            <Field label="Membre">
              <select name="staff_id" defaultValue="" className={inputCls} autoFocus>
                <option value="" disabled>
                  Choisir…
                </option>
                {available.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} · {ROLE_LABEL[s.role]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Heures">
              <input
                type="number"
                name="hours_planned"
                step="0.5"
                min="0"
                required
                className={inputCls}
              />
            </Field>
            <Field label="Taux €/h">
              <input
                type="number"
                name="rate_override"
                step="0.5"
                min="0"
                placeholder="défaut"
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Notes (setup, horaires spécifiques…)">
            <input name="notes" className={inputCls} />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Assigner
            </button>
          </div>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="py-3 text-center text-xs text-neutral-500">
          {staffOptions.length > 0 && !adding
            ? "Aucun membre assigné pour l'instant."
            : ""}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-900">
          {assignments.map((a) => {
            const staff = staffById.get(a.staff_id);
            const rate = a.rate_override ?? Number(staff?.hourly_rate ?? 0);
            const hoursShown =
              allowHoursDone && a.hours_done != null
                ? Number(a.hours_done)
                : Number(a.hours_planned ?? 0);
            const cost = rate * hoursShown;
            return (
              <li key={a.staff_id} className="py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      {staff?.full_name ?? "—"}
                      {staff?.role && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-neutral-500">
                          {ROLE_LABEL[staff.role]}
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span>{a.hours_planned}h prévues</span>
                      {allowHoursDone && (
                        <>
                          <span>·</span>
                          <AssignmentField
                            label="Heures faites"
                            initial={a.hours_done?.toString() ?? ""}
                            onCommit={(v) =>
                              patchAssignment(a.staff_id, {
                                hours_done: v === "" ? null : Number(v),
                              })
                            }
                            type="number"
                            step="0.5"
                            disabled={pending || readOnly}
                          />
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {rate > 0 ? `${rate.toFixed(2)} €/h` : "taux non défini"}
                      </span>
                      {cost > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-300">
                            {cost.toFixed(2)} € paie
                          </span>
                        </>
                      )}
                    </div>
                    {a.notes && (
                      <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2">
                        {a.notes}
                      </p>
                    )}
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => remove(a.staff_id)}
                      disabled={pending}
                      className="rounded p-1.5 text-neutral-500 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Tiny inline-edit field: edit-in-place with blur/enter to commit. */
function AssignmentField({
  label,
  initial,
  onCommit,
  type = "text",
  step,
  disabled,
}: {
  label: string;
  initial: string;
  onCommit: (v: string) => void;
  type?: string;
  step?: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      type={type}
      step={step}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) onCommit(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder={label}
      disabled={disabled}
      className="w-16 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[11px] text-neutral-200 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
    />
  );
}

const inputCls =
  "w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

