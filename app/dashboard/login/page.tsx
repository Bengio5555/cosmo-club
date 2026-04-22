import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

// useSearchParams in LoginForm requires a Suspense boundary so that the
// shell prerenders statically while the params-aware form hydrates on the
// client. Without this, Next.js fails the prerender for /dashboard/login.
export default function LoginPage() {
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

        <Suspense
          fallback={
            <div className="h-28 animate-pulse rounded-md border border-neutral-800 bg-neutral-900" />
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Cosmo Club Paris — Admin interne
        </p>
      </div>
    </div>
  );
}
