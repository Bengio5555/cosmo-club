"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy as CopyIcon,
  ExternalLink,
  GripVertical,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  type BriefingData,
  type BriefingScheduleStep,
  type BriefingContact,
  type BriefingAttachment,
} from "@/lib/server/briefingPreset";
import { rotateBriefingToken, saveBriefing } from "./actions";

export type CocktailLite = {
  id: string;
  name: string;
  description: string | null;
  qty_planned: number;
  ingredients: { name: string; qty: number; unit: string }[];
};

export function BriefingEditor({
  eventId,
  initial,
  shareUrl,
  staffPool,
  cocktails,
}: {
  eventId: string;
  initial: BriefingData;
  shareUrl: string | null;
  staffPool: string[];
  cocktails: CocktailLite[];
}) {
  const router = useRouter();
  const [data, setData] = useState<BriefingData>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );
  const [linkUrl, setLinkUrl] = useState<string | null>(shareUrl);

  function patch(next: Partial<BriefingData>) {
    setData((prev) => ({ ...prev, ...next }));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      const res = await saveBriefing(eventId, data);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setDirty(false);
      setMsg({ kind: "ok", text: "Briefing enregistré" });
      router.refresh();
      setTimeout(() => setMsg(null), 3000);
    });
  }

  function rotateLink() {
    if (
      !window.confirm(
        "Régénérer le lien ? L'ancien lien partagé sur WhatsApp deviendra invalide.",
      )
    )
      return;
    startTransition(async () => {
      const res = await rotateBriefingToken(eventId);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      const origin = window.location.origin;
      setLinkUrl(`${origin}/briefing/${eventId}?t=${res.token}`);
      setMsg({ kind: "ok", text: "Nouveau lien généré" });
      setTimeout(() => setMsg(null), 3000);
    });
  }

  function copyLink() {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl).then(() => {
      setMsg({ kind: "ok", text: "Lien copié" });
      setTimeout(() => setMsg(null), 2000);
    });
  }

  return (
    <div className="space-y-5">
      {/* Top action bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            Lien à partager (WhatsApp)
          </p>
          {linkUrl ? (
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                {linkUrl}
              </code>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
              >
                <CopyIcon className="h-3 w-3" />
                Copier
              </button>
              <a
                href={linkUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
              >
                <ExternalLink className="h-3 w-3" />
                Ouvrir
              </a>
            </div>
          ) : (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Aucun lien actif.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={rotateLink}
            disabled={pending}
            title="Régénère le token (l'ancien lien sera invalidé)"
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 hover:border-slate-400 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
          >
            <RefreshCw className="h-3 w-3" />
            Régénérer
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            {pending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            {dirty ? "Enregistrer" : "Enregistré"}
          </button>
        </div>
      </div>

      {msg && (
        <p
          className={
            "rounded-md px-3 py-2 text-xs " +
            (msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200")
          }
        >
          {msg.text}
        </p>
      )}

      {/* Schedule */}
      <ScheduleSection
        steps={data.schedule}
        staffPool={staffPool}
        onChange={(next) => patch({ schedule: next })}
      />

      {/* Stocks notes */}
      <Section
        title="Stocks à prendre"
        hint="Texte libre, prefilled par le mixologue. S'affiche dans la cellule 'Arrivée du personnel' sur le print."
      >
        <textarea
          value={data.stocks_notes}
          onChange={(e) => patch({ stocks_notes: e.target.value })}
          rows={8}
          placeholder={`ALCOOLS : ...\nSIROPS & PURÉES : ...\nJUS : ...\nSOFTS : ...\nFRAIS & AUTRES : ...`}
          className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
        />
      </Section>

      {/* External contacts */}
      <ContactsSection
        contacts={data.external_contacts}
        onChange={(next) => patch({ external_contacts: next })}
      />

      {/* Cocktails (read-only, auto from event_cocktails) */}
      {cocktails.length > 0 && (
        <Section
          title={`Recettes (${cocktails.length} cocktail${cocktails.length > 1 ? "s" : ""})`}
          hint="Lecture seule — édite les cocktails depuis /dashboard/cocktails. Affichés tels quels sur le print."
        >
          <ul className="space-y-3 text-sm">
            {cocktails.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <p className="font-medium text-slate-900 dark:text-white">
                  {c.name}
                  {c.qty_planned > 0 && (
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
                      · {c.qty_planned} prévus
                    </span>
                  )}
                </p>
                {c.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    {c.description}
                  </p>
                )}
                {c.ingredients.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {c.ingredients.map((i, idx) => (
                      <li key={idx}>
                        {i.qty} {i.unit} {i.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Dress code */}
      <Section title="Dress code">
        <input
          type="text"
          value={data.dress_code}
          onChange={(e) => patch({ dress_code: e.target.value })}
          placeholder="Chemise noire, pantalon noir, chaussures noires"
          className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
        />
      </Section>

      {/* General notes / warnings */}
      <Section
        title="Notes & warnings"
        hint="Stock tampon, gestion des déchets, particularités du lieu, etc."
      >
        <textarea
          value={data.general_notes}
          onChange={(e) => patch({ general_notes: e.target.value })}
          rows={5}
          placeholder="Stock tampon dans casiers — ne déclencher qu'avec accord Michael/Yvanna.&#10;Possibilité que l'événement soit prolongé : prévenir Wassim en fonction."
          className="w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-600"
        />
      </Section>

      {/* Attachments */}
      <AttachmentsSection
        items={data.attachments}
        onChange={(next) => patch({ attachments: next })}
      />
    </div>
  );
}

/* ─── helpers ────────────────────────────────────────────────────── */

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {title}
      </h2>
      {hint && (
        <p className="-mt-2 mb-3 text-[11px] text-slate-500 dark:text-slate-500">
          {hint}
        </p>
      )}
      {children}
    </section>
  );
}

function ScheduleSection({
  steps,
  staffPool,
  onChange,
}: {
  steps: BriefingScheduleStep[];
  staffPool: string[];
  onChange: (next: BriefingScheduleStep[]) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function patch(idx: number, p: Partial<BriefingScheduleStep>) {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function remove(idx: number) {
    onChange(steps.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([
      ...steps,
      { time: "", label: "", kind: "other", assignees: [], comment: "" },
    ]);
  }
  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = steps.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Planning de la prestation
        </h2>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
        >
          <Plus className="h-3 w-3" /> Ajouter une étape
        </button>
      </div>
      <ul className="space-y-2">
        {steps.map((step, idx) => {
          const isDragging = dragIdx === idx;
          const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
          return (
            <li
              key={idx}
              draggable
              onDragStart={(e) => {
                setDragIdx(idx);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(idx));
              }}
              onDragOver={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (overIdx !== idx) setOverIdx(idx);
              }}
              onDragLeave={() => {
                if (overIdx === idx) setOverIdx(null);
              }}
              onDrop={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                reorder(dragIdx, idx);
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                setDragIdx(null);
                setOverIdx(null);
              }}
              className={
                "grid grid-cols-1 gap-2 rounded-md border bg-slate-50 p-3 transition-colors dark:bg-slate-900/40 md:grid-cols-[24px_88px_minmax(0,1fr)_minmax(0,1fr)_28px] md:items-start " +
                (isOver
                  ? "border-[color:var(--color-grenat)] ring-1 ring-[color:var(--color-grenat)]/40"
                  : "border-slate-200 dark:border-slate-800") +
                (isDragging ? " opacity-50" : "")
              }
            >
              <span
                aria-label="Glisser pour réordonner"
                className="hidden cursor-grab self-center text-slate-400 active:cursor-grabbing dark:text-slate-500 md:inline-block"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <input
                type="time"
                value={step.time}
                onChange={(e) => patch(idx, { time: e.target.value })}
                className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white md:w-[88px]"
              />
              <div className="space-y-1">
                <input
                  type="text"
                  value={step.label}
                  onChange={(e) => patch(idx, { label: e.target.value })}
                  placeholder="Désignation"
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={step.assignees.join(", ")}
                  onChange={(e) =>
                    patch(idx, {
                      assignees: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder={
                    staffPool.length > 0
                      ? `Intervenants (ex. ${staffPool.slice(0, 2).join(", ")})`
                      : "Intervenants — séparés par virgule"
                  }
                  list={`staff-${idx}`}
                  className="w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                />
                {staffPool.length > 0 && (
                  <datalist id={`staff-${idx}`}>
                    {staffPool.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </div>
              <textarea
                value={step.comment}
                onChange={(e) => patch(idx, { comment: e.target.value })}
                rows={Math.max(2, step.comment.split("\n").length)}
                placeholder="Commentaire / détails (adresse, contact, numéro de commande…)"
                className="min-h-[40px] w-full resize-y rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Supprimer l'étape"
                className="shrink-0 self-start rounded p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ContactsSection({
  contacts,
  onChange,
}: {
  contacts: BriefingContact[];
  onChange: (next: BriefingContact[]) => void;
}) {
  function patch(idx: number, p: Partial<BriefingContact>) {
    onChange(contacts.map((c, i) => (i === idx ? { ...c, ...p } : c)));
  }
  function add() {
    onChange([...contacts, { role: "", name: "" }]);
  }
  function remove(idx: number) {
    onChange(contacts.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Contacts livreurs externes
        </h2>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
        >
          <Plus className="h-3 w-3" /> Ajouter un contact
        </button>
      </div>
      {contacts.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Aucun contact externe (Mondial Glaçons, Acaris, traiteur, etc.).
        </p>
      ) : (
        <ul className="space-y-2">
          {contacts.map((c, idx) => (
            <li
              key={idx}
              className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_28px]"
            >
              <input
                type="text"
                value={c.role}
                onChange={(e) => patch(idx, { role: e.target.value })}
                placeholder="Rôle (ex. Livraison glaçons)"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="text"
                value={c.name}
                onChange={(e) => patch(idx, { name: e.target.value })}
                placeholder="Nom / société"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={c.phone ?? ""}
                  onChange={(e) => patch(idx, { phone: e.target.value })}
                  placeholder="Téléphone"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  value={c.order_ref ?? ""}
                  onChange={(e) => patch(idx, { order_ref: e.target.value })}
                  placeholder="N° commande"
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Supprimer le contact"
                className="shrink-0 self-start rounded p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AttachmentsSection({
  items,
  onChange,
}: {
  items: BriefingAttachment[];
  onChange: (next: BriefingAttachment[]) => void;
}) {
  function patch(idx: number, p: Partial<BriefingAttachment>) {
    onChange(items.map((a, i) => (i === idx ? { ...a, ...p } : a)));
  }
  function add() {
    onChange([...items, { label: "", url: "" }]);
  }
  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
          Documents annexes
        </h2>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] text-slate-700 hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700"
        >
          <Plus className="h-3 w-3" /> Ajouter un lien
        </button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
        Colle l&apos;URL d&apos;un menu, plan d&apos;implantation ou autre
        document hébergé sur Drive / Notion / Supabase Storage. Le guide
        de montage standard est déjà inclus en bas du briefing.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-500">
          Aucun document joint pour cet événement.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((a, idx) => (
            <li
              key={idx}
              className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40 md:grid-cols-[minmax(0,200px)_minmax(0,1fr)_28px]"
            >
              <input
                type="text"
                value={a.label}
                onChange={(e) => patch(idx, { label: e.target.value })}
                placeholder="Nom du document"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <input
                type="url"
                value={a.url}
                onChange={(e) => patch(idx, { url: e.target.value })}
                placeholder="https://…"
                className="rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Supprimer le lien"
                className="shrink-0 self-start rounded p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
