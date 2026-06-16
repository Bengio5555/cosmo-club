"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "password" | "magic";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useSearchParams();
  const from = params.get("from") || "/dashboard";
  const callbackError = params.get("error");
  const callbackDetail = params.get("detail");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();

    if (mode === "password") {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (err) {
        setError(err.message);
        return;
      }
      // Session cookie is set; bounce to the requested page.
      router.replace(from);
      router.refresh();
      return;
    }

    // Magic link
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

  // Create / reset a password. Sends a recovery email pointing at the
  // auth callback with next=/dashboard/auth/set-password, where the user
  // chooses a password. Works even if they never had one — afterwards
  // they can sign in with the password tab and skip email links entirely.
  async function sendPasswordReset() {
    if (!email) {
      setError("Entre d'abord ton adresse email ci-dessus.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/dashboard/auth/callback?next=${encodeURIComponent(
      "/dashboard/auth/set-password",
    )}`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setResetSent(true);
  }

  if (resetSent) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
        ✅ Email envoyé à <span className="text-white">{email}</span>.
        <br />
        <span className="mt-2 block text-xs text-neutral-500">
          Ouvre le dernier email et clique sur le lien pour définir ton mot
          de passe. Astuce&nbsp;: ouvre-le sur ordinateur si le lien échoue
          depuis Mail sur iPhone.
        </span>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
        ✅ Lien envoyé à <span className="text-white">{email}</span>.
        <br />
        <span className="mt-2 block text-xs text-neutral-500">
          Ouvre l&apos;email et clique sur le lien pour te connecter.
        </span>
      </div>
    );
  }

  return (
    <>
      {callbackError && (
        <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <p className="font-semibold">Échec du lien magique — {callbackError}</p>
          {callbackDetail && <p className="mt-1 opacity-80">{callbackDetail}</p>}
        </div>
      )}

      {/* Mode toggle */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-1 text-xs">
        <button
          type="button"
          onClick={() => setMode("password")}
          className={`rounded px-2 py-1.5 transition-colors ${
            mode === "password"
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Mot de passe
        </button>
        <button
          type="button"
          onClick={() => setMode("magic")}
          className={`rounded px-2 py-1.5 transition-colors ${
            mode === "magic"
              ? "bg-neutral-800 text-white"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          Lien email
        </button>
      </div>

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

        {mode === "password" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-neutral-400">
              Mot de passe
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
            />
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={loading}
              className="mt-1.5 text-[11px] text-neutral-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-white disabled:opacity-50"
            >
              Créer ou réinitialiser mon mot de passe
            </button>
          </label>
        )}

        {error && (
          <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email || (mode === "password" && !password)}
          className="w-full rounded-md bg-[color:var(--color-grenat)] px-3 py-2.5 text-sm font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "…"
            : mode === "password"
            ? "Se connecter"
            : "Recevoir le lien"}
        </button>
      </form>

      <p className="mt-4 text-center text-[10px] text-neutral-500">
        {mode === "password"
          ? "Pense à changer ton mot de passe après la 1ʳᵉ connexion."
          : "Aucun mot de passe, tu reçois un lien unique par email."}
      </p>
    </>
  );
}
