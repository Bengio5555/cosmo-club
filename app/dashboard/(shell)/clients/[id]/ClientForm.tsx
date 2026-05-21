"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";
import type { Tables } from "@/types/database";
import { saveClient, type ClientInput } from "../actions";

type Client = Tables<"clients">;

export function ClientForm({ client }: { client: Client }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const [first_name, setFirstName] = useState(client.first_name ?? "");
  const [last_name, setLastName] = useState(client.last_name ?? "");
  const [company_name, setCompanyName] = useState(client.company_name ?? "");
  const [email, setEmail] = useState(client.email ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [billing_address, setBillingAddress] = useState(
    client.billing_address ?? "",
  );
  const [postal_code, setPostalCode] = useState(client.postal_code ?? "");
  const [city, setCity] = useState(client.city ?? "");
  const [country, setCountry] = useState(client.country ?? "France");
  const [siret, setSiret] = useState(client.siret ?? "");
  const [tva_intracom, setTva] = useState(client.tva_intracom ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");

  const [baseline, setBaseline] = useState("");
  useEffect(() => {
    setBaseline(serialize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function serialize(): string {
    return JSON.stringify({
      first_name,
      last_name,
      company_name,
      email,
      phone,
      billing_address,
      postal_code,
      city,
      country,
      siret,
      tva_intracom,
      notes,
    });
  }

  const dirty = baseline !== "" && serialize() !== baseline;

  function save() {
    const input: ClientInput = {
      first_name,
      last_name,
      company_name,
      email,
      phone,
      billing_address,
      postal_code,
      city,
      country,
      siret,
      tva_intracom,
      notes,
    };
    startTransition(async () => {
      setMsg(null);
      const res = await saveClient(client.id, input);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setBaseline(serialize());
      setMsg({ kind: "ok", text: "Coordonnées enregistrées." });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Coordonnées</h2>
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:border-slate-300 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : dirty ? (
            <Save className="h-3 w-3" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          {dirty ? "Enregistrer" : "Enregistré"}
        </button>
      </div>

      {msg && (
        <div
          className={`mb-3 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Prénom">
            <input value={first_name} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Nom">
            <input value={last_name} onChange={(e) => setLastName(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Société (B2B)">
          <input value={company_name} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
        </Field>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Email">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Téléphone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Adresse de facturation">
          <input value={billing_address} onChange={(e) => setBillingAddress(e.target.value)} className={inputCls} />
        </Field>

        <div className="grid gap-3 md:grid-cols-[120px_1fr_140px]">
          <Field label="CP">
            <input value={postal_code} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Ville">
            <input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Pays">
            <input value={country} onChange={(e) => setCountry(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="SIRET">
            <input value={siret} onChange={(e) => setSiret(e.target.value)} className={inputCls} />
          </Field>
          <Field label="TVA intracom.">
            <input value={tva_intracom} onChange={(e) => setTva(e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Notes internes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inputCls} />
        </Field>
      </div>

      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-600">
        Les factures déjà émises conservent le snapshot légal au moment de
        l&apos;émission — modifier le SIRET ou l&apos;adresse ici n&apos;impacte que les
        futures factures.
      </p>
    </section>
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
