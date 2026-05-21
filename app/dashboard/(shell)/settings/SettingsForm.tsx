"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Settings = Tables<"settings">;

export function SettingsForm({ initial }: { initial: Settings | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [f, setF] = useState<Partial<Settings>>(initial ?? { id: 1 });

  function upd<K extends keyof Settings>(k: K, v: Settings[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setMsg(null);
      const supabase = createClient();
      const { error } = await supabase
        .from("settings")
        .upsert({ ...f, id: 1 })
        .eq("id", 1);
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      setMsg({ kind: "ok", text: "Paramètres enregistrés." });
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      <Section title="Identité légale">
        <Row>
          <Field label="Raison sociale">
            <Input value={f.company_name ?? ""} onChange={(v) => upd("company_name", v)} />
          </Field>
          <Field label="Forme juridique">
            <Input
              value={f.legal_form ?? ""}
              onChange={(v) => upd("legal_form", v)}
              placeholder="SAS / SARL / EURL / Micro…"
            />
          </Field>
        </Row>
        <Row>
          <Field label="SIRET">
            <Input value={f.siret ?? ""} onChange={(v) => upd("siret", v)} />
          </Field>
          <Field label="N° TVA intracom">
            <Input
              value={f.tva_intracom ?? ""}
              onChange={(v) => upd("tva_intracom", v)}
              placeholder="FRXX XXXXXXXXX"
              disabled={f.tva_franchise ?? true}
            />
          </Field>
        </Row>
        <Checkbox
          label='Franchise en base de TVA (mention "TVA non applicable, art. 293 B du CGI")'
          checked={f.tva_franchise ?? true}
          onChange={(v) => upd("tva_franchise", v)}
        />
      </Section>

      <Section title="Adresse">
        <Field label="Adresse ligne 1">
          <Input value={f.address_line1 ?? ""} onChange={(v) => upd("address_line1", v)} />
        </Field>
        <Field label="Adresse ligne 2">
          <Input value={f.address_line2 ?? ""} onChange={(v) => upd("address_line2", v)} />
        </Field>
        <Row>
          <Field label="Code postal">
            <Input value={f.postal_code ?? ""} onChange={(v) => upd("postal_code", v)} />
          </Field>
          <Field label="Ville">
            <Input value={f.city ?? ""} onChange={(v) => upd("city", v)} />
          </Field>
          <Field label="Pays">
            <Input value={f.country ?? "France"} onChange={(v) => upd("country", v)} />
          </Field>
        </Row>
      </Section>

      <Section title="Contact public">
        <Row>
          <Field label="Email">
            <Input type="email" value={f.email ?? ""} onChange={(v) => upd("email", v)} />
          </Field>
          <Field label="Téléphone">
            <Input value={f.phone ?? ""} onChange={(v) => upd("phone", v)} />
          </Field>
        </Row>
      </Section>

      <Section title="Notifications nouveaux leads">
        <Field label="Email qui reçoit les nouveaux leads du formulaire">
          <Input
            type="email"
            value={f.lead_notification_email ?? ""}
            onChange={(v) => upd("lead_notification_email", v)}
            placeholder="leads@cosmoclub.fr (laisse vide pour utiliser l'email de contact public)"
          />
        </Field>
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          À chaque nouveau devis envoyé depuis le formulaire public, une notification arrive sur cette boîte. Si vide, on retombe sur l&apos;email de contact public.
        </p>
      </Section>

      <Section title="Banque (affichage facture)">
        <Row>
          <Field label="IBAN">
            <Input value={f.iban ?? ""} onChange={(v) => upd("iban", v)} />
          </Field>
          <Field label="BIC">
            <Input value={f.bic ?? ""} onChange={(v) => upd("bic", v)} />
          </Field>
        </Row>
      </Section>

      <Section title="Facturation">
        <Row>
          <Field label="Taux TVA par défaut (%)">
            <Input
              type="number"
              step="0.01"
              value={(f.default_tva_rate ?? 20).toString()}
              onChange={(v) => upd("default_tva_rate", Number(v))}
              disabled={f.tva_franchise ?? true}
            />
          </Field>
          <Field label="Validité devis (jours)">
            <Input
              type="number"
              value={(f.quote_validity_days ?? 30).toString()}
              onChange={(v) => upd("quote_validity_days", Number(v))}
            />
          </Field>
          <Field label="Échéance facture (jours)">
            <Input
              type="number"
              value={(f.invoice_due_days ?? 30).toString()}
              onChange={(v) => upd("invoice_due_days", Number(v))}
            />
          </Field>
        </Row>
        <Row>
          <Field label="Préfixe n° devis">
            <Input
              value={f.quote_number_prefix ?? "DV"}
              onChange={(v) => upd("quote_number_prefix", v)}
            />
          </Field>
          <Field label="Préfixe n° facture">
            <Input
              value={f.invoice_number_prefix ?? "FA"}
              onChange={(v) => upd("invoice_number_prefix", v)}
            />
          </Field>
        </Row>
        <Field label="Mentions pénalités de retard">
          <Textarea
            value={f.penalty_rate_text ?? ""}
            onChange={(v) => upd("penalty_rate_text", v)}
            rows={3}
          />
        </Field>
      </Section>

      {msg && (
        <div
          className={`rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-green-700/40 bg-green-900/30 text-green-300"
              : "border-red-700/40 bg-red-900/30 text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-[color:var(--color-grenat)] px-4 py-2 text-sm font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Ces valeurs apparaîtront automatiquement sur tes devis et factures.
        </p>
      </div>
    </form>
  );
}

/* ─── Primitives ─────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
        {children}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input(props: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={props.type ?? "text"}
      step={props.step}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      disabled={props.disabled}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-50"
    />
  );
}

function Textarea(props: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      rows={props.rows ?? 3}
      className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
    />
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-[color:var(--color-grenat)] focus:ring-[color:var(--color-grenat)]"
      />
      <span>{label}</span>
    </label>
  );
}
