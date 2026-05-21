"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { saveNewClient, type ClientInput } from "./actions";

export function NewClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [dupId, setDupId] = useState<string | null>(null);

  function submit(form: FormData) {
    setErr(null);
    setDupId(null);
    const input: ClientInput = {
      first_name: form.get("first_name") as string,
      last_name: form.get("last_name") as string,
      company_name: form.get("company_name") as string,
      email: form.get("email") as string,
      phone: form.get("phone") as string,
      billing_address: form.get("billing_address") as string,
      postal_code: form.get("postal_code") as string,
      city: form.get("city") as string,
      country: form.get("country") as string,
      siret: form.get("siret") as string,
      tva_intracom: form.get("tva_intracom") as string,
      notes: form.get("notes") as string,
    };
    startTransition(async () => {
      const res = await saveNewClient(input);
      if (!res.ok) {
        setErr(res.error);
        if ("duplicateId" in res && res.duplicateId) setDupId(res.duplicateId);
        return;
      }
      setOpen(false);
      router.push(`/dashboard/clients/${res.id}`);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setDupId(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
      >
        <Plus className="h-3.5 w-3.5" /> Nouveau client
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Nouveau client
                </p>
                <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Création manuelle
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {err && (
              <div className="mb-3 rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
                {err}
                {dupId && (
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/clients/${dupId}`)}
                    className="ml-2 underline hover:text-slate-900 dark:hover:text-white"
                  >
                    Ouvrir la fiche existante →
                  </button>
                )}
              </div>
            )}

            <form action={submit} className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Prénom">
                  <input name="first_name" className={inputCls} />
                </Field>
                <Field label="Nom">
                  <input name="last_name" className={inputCls} />
                </Field>
              </div>

              <Field label="Société (B2B)">
                <input name="company_name" className={inputCls} />
              </Field>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Email">
                  <input type="email" name="email" className={inputCls} />
                </Field>
                <Field label="Téléphone">
                  <input name="phone" className={inputCls} />
                </Field>
              </div>

              <Field label="Adresse de facturation">
                <input name="billing_address" className={inputCls} />
              </Field>

              <div className="grid gap-3 md:grid-cols-[120px_1fr_140px]">
                <Field label="CP">
                  <input name="postal_code" className={inputCls} />
                </Field>
                <Field label="Ville">
                  <input name="city" className={inputCls} />
                </Field>
                <Field label="Pays">
                  <input name="country" defaultValue="France" className={inputCls} />
                </Field>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Field label="SIRET (si B2B)">
                  <input name="siret" className={inputCls} />
                </Field>
                <Field label="TVA intracom.">
                  <input name="tva_intracom" className={inputCls} />
                </Field>
              </div>

              <Field label="Notes internes">
                <textarea name="notes" rows={2} className={inputCls} />
              </Field>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                  className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
                >
                  {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Créer le client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
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
