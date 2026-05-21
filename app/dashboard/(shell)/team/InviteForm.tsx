"use client";

import { useState, useTransition } from "react";
import { Mail, Send } from "lucide-react";
import { inviteMember } from "./actions";
import { ROLE_LABEL, type UserRole } from "@/lib/auth/roles";

const ROLES_SELECTABLE: UserRole[] = ["admin", "manager", "staff", "compta"];

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { type: "ok" | "error"; text: string } | null
  >(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await inviteMember({ email, role });
      if (result.ok) {
        setMessage({
          type: "ok",
          text: `Invitation envoyée à ${email}. Le collaborateur recevra un email pour définir son mot de passe.`,
        });
        setEmail("");
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
        <Mail className="h-4 w-4 text-slate-500 dark:text-neutral-400" />
        Inviter un collaborateur
      </h2>
      <p className="mt-1 text-[11px] text-slate-500 dark:text-neutral-500">
        Email + rôle. Une invitation lui sera envoyée immédiatement.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@exemple.fr"
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-neutral-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500">
            Rôle
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 dark:text-white dark:shadow-none focus:border-neutral-600 focus:outline-none"
          >
            {ROLES_SELECTABLE.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200 disabled:opacity-60"
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? "Envoi…" : "Envoyer l'invitation"}
        </button>

        {message && (
          <div
            className={
              message.type === "ok"
                ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] text-emerald-200"
                : "rounded-md border border-red-500/30 bg-red-500/10 p-2.5 text-[11px] text-red-200"
            }
          >
            {message.text}
          </div>
        )}
      </form>
    </div>
  );
}
