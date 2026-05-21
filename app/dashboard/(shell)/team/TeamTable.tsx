"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { updateMemberRole, removeMember } from "./actions";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/roles";

const ROLES_SELECTABLE: UserRole[] = ["admin", "manager", "staff", "compta"];

type Member = {
  id: string;
  email: string;
  role: UserRole;
  invited_by: string | null;
  created_at: string;
};

export function TeamTable({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rôle</th>
            <th className="px-4 py-3 hidden md:table-cell">Ajouté le</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {members.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-500">
                Aucun utilisateur pour le moment.
              </td>
            </tr>
          )}
          {members.map((m) => (
            <TeamRow key={m.id} member={m} isSelf={m.id === currentUserId} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamRow({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const [role, setRole] = useState<UserRole>(member.role);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isOwner = member.role === "owner";
  const locked = isOwner || isSelf;

  function onRoleChange(next: UserRole) {
    setRole(next);
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRole({ userId: member.id, role: next });
      if (!result.ok) {
        setError(result.error);
        setRole(member.role);
      }
    });
  }

  function onRemove() {
    if (
      !confirm(
        `Retirer ${member.email} de l'équipe ? L'accès au dashboard sera révoqué immédiatement.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await removeMember({ userId: member.id });
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  return (
    <tr className="text-slate-700 dark:text-slate-200">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="truncate">{member.email}</span>
          {isSelf && (
            <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-400">
              vous
            </span>
          )}
        </div>
        {error && <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{error}</p>}
      </td>
      <td className="px-4 py-3">
        {locked ? (
          <span className="text-slate-500 dark:text-slate-400">{ROLE_LABEL[member.role]}</span>
        ) : (
          <select
            value={role}
            disabled={pending}
            onChange={(e) => onRoleChange(e.target.value as UserRole)}
            className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-slate-600 focus:outline-none disabled:opacity-60"
          >
            {ROLES_SELECTABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        )}
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-slate-500">
        {new Date(member.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="px-4 py-3 text-right">
        {locked ? (
          <span className="text-[10px] text-slate-400 dark:text-slate-600">—</span>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Retirer
          </button>
        )}
      </td>
    </tr>
  );
}
