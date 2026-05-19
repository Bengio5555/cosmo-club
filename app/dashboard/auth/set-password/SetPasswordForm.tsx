"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

export function SetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Mot de passe trop court — minimum ${MIN_LENGTH} caractères.`);
      return;
    }
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-400">
          Nouveau mot de passe
        </span>
        <input
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-neutral-400">
          Confirme le mot de passe
        </span>
        <input
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_LENGTH}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !password || !confirm}
        className="w-full rounded-md bg-[color:var(--color-grenat)] px-3 py-2.5 text-sm font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "…" : "Enregistrer et accéder au dashboard"}
      </button>

      <p className="pt-2 text-center text-[10px] text-neutral-500">
        Minimum {MIN_LENGTH} caractères. Tu pourras le changer plus tard.
      </p>
    </form>
  );
}
