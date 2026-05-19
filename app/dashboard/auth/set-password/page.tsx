import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";
import logoSrc from "@/public/brand/cosmo-logo.avif";

/**
 * Step-up page for first-time invited users: requires an active session
 * (set by the invite callback), prompts a new password, then bounces to
 * the dashboard. Also reused for the recovery flow ("mot de passe oublié").
 */
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Lien expiré ou ouvert sans session — renvoyer sur le login.
    redirect("/dashboard/login?error=session_required");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-neutral-100">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-start gap-2">
          <Image
            src={logoSrc}
            alt="Cosmo Club"
            width={Math.round((304 / 106) * 36)}
            height={36}
            priority
            unoptimized
            className="h-9 w-auto select-none"
          />
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
            Dashboard admin
          </p>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-white">
          Définis ton mot de passe
        </h1>
        <p className="mb-8 text-sm text-neutral-400">
          Bienvenue {user.email}. Choisis un mot de passe pour pouvoir te
          reconnecter plus tard sans passer par l&apos;email.
        </p>

        <SetPasswordForm />

        <p className="mt-10 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
          Cosmo Club Paris — Admin interne
        </p>
      </div>
    </div>
  );
}
