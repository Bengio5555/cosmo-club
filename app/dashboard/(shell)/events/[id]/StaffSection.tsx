"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Banknote,
  Check,
  Landmark,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  assignStaff,
  clearStaffPayment,
  recordStaffPayment,
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

  function savePayment(
    staffId: string,
    payment: {
      paid_amount: number;
      paid_at: string;
      payment_method: "especes" | "virement";
    },
  ) {
    setErr(null);
    startTransition(async () => {
      const res = await recordStaffPayment(eventId, staffId, payment);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function unsetPayment(staffId: string) {
    if (!window.confirm("Annuler le règlement de ce membre ?")) return;
    setErr(null);
    startTransition(async () => {
      const res = await clearStaffPayment(eventId, staffId);
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

  // Payment tracking summary. A member is "réglé" once paid_at is set;
  // we surface a count + the total cash actually disbursed so the
  // operator sees at a glance how much of the staff payroll is settled.
  const paidAssignments = assignments.filter((a) => a.paid_at != null);
  const paidCount = paidAssignments.length;
  const totalPaid = paidAssignments.reduce(
    (s, a) => s + Number(a.paid_amount ?? 0),
    0,
  );

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Équipe</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            {assignments.length} assigné{assignments.length > 1 ? "s" : ""}
            {totalHoursPlanned > 0 && ` · ${totalHoursPlanned}h prévues`}
            {totalCost > 0 && ` · ${totalCost.toFixed(2)} € paie estimée`}
            {assignments.length > 0 && (
              <span
                className={
                  paidCount === assignments.length
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }
              >
                {" · "}
                {paidCount}/{assignments.length} réglé
                {paidCount > 1 ? "s" : ""}
                {totalPaid > 0 && ` (${totalPaid.toFixed(2)} €)`}
              </span>
            )}
          </p>
        </div>
        {!readOnly && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={pending || available.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-900 dark:text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            <UserPlus className="h-3 w-3" /> Assigner
          </button>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          {err}
        </div>
      )}

      {staffOptions.length === 0 && (
        <div className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3 text-xs text-slate-500 dark:text-slate-400">
          Aucun membre d&apos;équipe dans la base.{" "}
          <Link
            href="/dashboard/staff"
            className="text-slate-700 dark:text-slate-200 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Ajoute d&apos;abord tes barmen / baristas →
          </Link>
        </div>
      )}

      {adding && staffOptions.length > 0 && (
        <form
          action={handleAssign}
          className="mb-3 space-y-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3"
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
              className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Assigner
            </button>
          </div>
        </form>
      )}

      {assignments.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
          {staffOptions.length > 0 && !adding
            ? "Aucun membre assigné pour l'instant."
            : ""}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-900">
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
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {staff?.full_name ?? "—"}
                      {staff?.role && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          {ROLE_LABEL[staff.role]}
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-500">
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
                          <span className="text-emerald-700 dark:text-emerald-300">
                            {cost.toFixed(2)} € paie
                          </span>
                        </>
                      )}
                    </div>
                    {a.notes && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500 line-clamp-2">
                        {a.notes}
                      </p>
                    )}
                    {/* Payment tracking row — settled/unsettled badge +
                        inline editor. Always visible (even on closed
                        events) so the operator can keep reconciling
                        cash after the event is marked terminé. */}
                    <PaymentTracker
                      assignment={a}
                      suggestedAmount={cost}
                      pending={pending}
                      onSave={(p) => savePayment(a.staff_id, p)}
                      onClear={() => unsetPayment(a.staff_id)}
                    />
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => remove(a.staff_id)}
                      disabled={pending}
                      className="rounded p-1.5 text-slate-500 dark:text-slate-500 transition-colors hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-300"
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

/* ─── Per-assignment payment tracker ──────────────────────────────
   Two states:
   - Settled (paid_at set): green badge + "X € · date · méthode" recap,
     with an "Annuler" action to revert to unsettled.
   - Unsettled: amber badge + "Marquer réglé" button that expands a
     compact form (montant prefilled with the estimated cost, date
     defaulting to today, method toggle espèces/virement).
   The status invariant lives server-side (recordStaffPayment /
   clearStaffPayment write all three fields together). */
function PaymentTracker({
  assignment,
  suggestedAmount,
  pending,
  onSave,
  onClear,
}: {
  assignment: Assignment;
  suggestedAmount: number;
  pending: boolean;
  onSave: (p: {
    paid_amount: number;
    paid_at: string;
    payment_method: "especes" | "virement";
  }) => void;
  onClear: () => void;
}) {
  const isPaid = assignment.paid_at != null;
  const [editing, setEditing] = useState(false);
  // Local form state seeded from the assignment (for re-edit) or from
  // sensible defaults (estimated cost, today, espèces).
  const [amount, setAmount] = useState<string>(
    assignment.paid_amount != null
      ? String(assignment.paid_amount)
      : suggestedAmount > 0
        ? suggestedAmount.toFixed(2)
        : "",
  );
  const [date, setDate] = useState<string>(
    assignment.paid_at ?? todayISO(),
  );
  const [method, setMethod] = useState<"especes" | "virement">(
    (assignment.payment_method as "especes" | "virement") ?? "virement",
  );

  if (isPaid && !editing) {
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          <Check className="h-3 w-3" /> Réglé
        </span>
        <span className="text-slate-600 dark:text-slate-300">
          {Number(assignment.paid_amount ?? 0).toFixed(2)} €
          {assignment.paid_at && ` · ${formatDateShort(assignment.paid_at)}`}
          {assignment.payment_method && (
            <span className="inline-flex items-center gap-1">
              {" · "}
              {assignment.payment_method === "especes" ? (
                <>
                  <Banknote className="inline h-3 w-3" /> Espèces
                </>
              ) : (
                <>
                  <Landmark className="inline h-3 w-3" /> Virement
                </>
              )}
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          className="text-slate-500 underline decoration-dotted underline-offset-2 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-300 disabled:opacity-60"
        >
          Modifier
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={pending}
          className="text-slate-500 underline decoration-dotted underline-offset-2 hover:text-red-400 dark:text-slate-500 disabled:opacity-60"
        >
          Annuler
        </button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="mt-1.5 flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          Non réglé
        </span>
        <button
          type="button"
          onClick={() => setEditing(true)}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-0.5 font-medium text-slate-700 transition-colors hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 disabled:opacity-60"
        >
          <Banknote className="h-3 w-3" /> Marquer réglé
        </button>
      </div>
    );
  }

  // Editing form (both "mark paid" and "edit existing payment").
  return (
    <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="grid gap-2 sm:grid-cols-[100px_120px_minmax(0,1fr)]">
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Montant €
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={payInputCls}
            autoFocus
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={payInputCls}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-slate-500">
            Type
          </span>
          <select
            value={method}
            onChange={(e) =>
              setMethod(e.target.value as "especes" | "virement")
            }
            className={payInputCls}
          >
            <option value="virement">Virement</option>
            <option value="especes">Espèces</option>
          </select>
        </label>
      </div>
      <div className="mt-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            // Reset local edits back to the persisted values.
            setAmount(
              assignment.paid_amount != null
                ? String(assignment.paid_amount)
                : suggestedAmount > 0
                  ? suggestedAmount.toFixed(2)
                  : "",
            );
            setDate(assignment.paid_at ?? todayISO());
            setMethod(
              (assignment.payment_method as "especes" | "virement") ??
                "virement",
            );
          }}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <X className="h-3 w-3" /> Annuler
        </button>
        <button
          type="button"
          disabled={pending || !amount || !date}
          onClick={() => {
            onSave({
              paid_amount: Number(amount) || 0,
              paid_at: date,
              payment_method: method,
            });
            setEditing(false);
          }}
          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Enregistrer
        </button>
      </div>
    </div>
  );
}

const payInputCls =
  "w-full rounded border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none";

/** Local date as YYYY-MM-DD (avoids UTC off-by-one from toISOString). */
function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

/** Compact FR date "12 juin" from a YYYY-MM-DD string. */
function formatDateShort(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
      className="w-16 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-1.5 py-0.5 text-[11px] text-slate-700 dark:text-slate-200 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
    />
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

