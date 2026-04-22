"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/dashboard/auth/callback?next=${encodeURIComponent(from)}`;

    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[color:var(--color-grenat)] text-xs font-bold text-[color:var(--color-bone)]">
            CC
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Cosmo Club</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
              Dashboard admin
            </p>
          </div>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-white">Connexion</h1>
        <p className="mb-8 text-sm text-neutral-400">
          Reçois un lien de connexion par email. Aucun mot de passe.
        </p>

        {sent ? (
          <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            ✅ Lien envoyé à <span className="text-white">{email}</span>.
            <br />
            <span className="mt-2 block text-xs text-neutral-500">
              Ouvre l&apos;email et clique sur le lien pour te connecter.
            </span>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-neutral-400">
                Adresse email
              </span>
              <input
                type="email"
                required
                autoFocus
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
                placeholder="toi@cosmoclub.fr"
              />
            </label>

            {error && (
              <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full rounded-md bg-[color:var(--color-grenat)] px-3 py-2.5 text-sm font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Recevoir le lien"}
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Cosmo Club Paris — Admin interne
        </p>
      </div>
    </div>
  );
}
