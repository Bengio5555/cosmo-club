"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  Send,
  Eye,
  GripVertical,
  Euro,
  XCircle,
  Ban,
  RotateCcw,
  ExternalLink,
  X,
  BellRing,
} from "lucide-react";
import type { Database, Tables } from "@/types/database";
import { formatEUR } from "@/lib/format";
import {
  saveInvoice,
  setInvoiceStatus,
  sendInvoice,
  sendInvoiceReminder,
  markInvoicePaid,
  deleteInvoice,
  createCreditNote,
  type SaveInvoiceInput,
} from "./actions";

type Invoice = Tables<"invoices">;
type InvoiceItem = Tables<"invoice_items">;
type InvoiceStatus = Database["public"]["Enums"]["invoice_status"];

type EditableItem = {
  localId: string;
  dbId?: string;
  title: string;
  description: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
};

function uid() {
  return `new-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type CreditNoteRef = { id: string; number: string; status: InvoiceStatus; total_ttc: number };
type SourceInvoiceRef = { id: string; number: string };

export function InvoiceEditor({
  invoice,
  items: initialItems,
  sourceInvoice = null,
  creditNotes = [],
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  sourceInvoice?: SourceInvoiceRef | null;
  creditNotes?: CreditNoteRef[];
}) {
  const router = useRouter();
  const readOnly = invoice.status !== "brouillon";
  const isCreditNote = invoice.is_credit_note;
  const canIssueCreditNote =
    !isCreditNote && ["envoye", "en_retard", "paye"].includes(invoice.status);
  const canRemind =
    !isCreditNote && (invoice.status === "envoye" || invoice.status === "en_retard");

  const [creditModal, setCreditModal] = useState(false);
  const [creditReason, setCreditReason] = useState("");

  // ─── Metadata state ───
  const [subject, setSubject] = useState(invoice.subject ?? "");
  const [terms, setTerms] = useState(invoice.terms ?? "");
  const [issueDate, setIssueDate] = useState<string>(
    invoice.issue_date ? invoice.issue_date.slice(0, 10) : "",
  );
  const [dueDate, setDueDate] = useState<string>(
    invoice.due_date ? invoice.due_date.slice(0, 10) : "",
  );
  const [eventDate, setEventDate] = useState<string>(
    invoice.event_date ? invoice.event_date.slice(0, 10) : "",
  );
  const [tvaRate, setTvaRate] = useState<string>(String(invoice.tva_rate ?? 20));

  const [items, setItems] = useState<EditableItem[]>(() =>
    initialItems
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        localId: i.id,
        dbId: i.id,
        title: i.title ?? "",
        description: i.description ?? "",
        qty: Number(i.qty ?? 1),
        unit: i.unit ?? "unité",
        unit_price_ht: Number(i.unit_price_ht ?? 0),
      })),
  );

  // ─── Live totals ───
  const totalHt = useMemo(
    () => round2(items.reduce((s, it) => s + it.qty * it.unit_price_ht, 0)),
    [items],
  );
  const tvaNum = Number(tvaRate) || 0;
  const totalTva = round2((totalHt * tvaNum) / 100);
  const totalTtc = round2(totalHt + totalTva);

  // ─── Transition + save ───
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [baseline, setBaseline] = useState<string>("");
  useEffect(() => {
    setBaseline(serialize(toPayload()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isDirty = baseline !== "" && serialize(toPayload()) !== baseline;

  function toPayload(): SaveInvoiceInput {
    return {
      subject: subject.trim() || null,
      terms: terms.trim() || null,
      issue_date: issueDate || new Date().toISOString().slice(0, 10),
      due_date: dueDate || null,
      event_date: eventDate || null,
      tva_rate: tvaNum,
      items: items.map((it, i) => ({
        id: it.dbId,
        position: i,
        title: it.title.trim(),
        description: it.description.trim() || null,
        qty: it.qty,
        unit: it.unit.trim() || null,
        unit_price_ht: it.unit_price_ht,
      })),
    };
  }

  function save() {
    const payload = toPayload();
    if (payload.items.some((it) => !it.title)) {
      setMsg({ kind: "err", text: "Chaque ligne a besoin d'un titre." });
      return;
    }
    startTransition(async () => {
      setMsg(null);
      const res = await saveInvoice(invoice.id, payload);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setBaseline(serialize(payload));
      setMsg({ kind: "ok", text: "Facture enregistrée." });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  function send() {
    if (
      !window.confirm(
        "Figer et envoyer la facture ? Une fois émise, elle ne pourra plus être modifiée (conformité FR).",
      )
    )
      return;
    startTransition(async () => {
      setMsg(null);
      const res = await sendInvoice(invoice.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      if (res.emailed) {
        setMsg({ kind: "ok", text: "Facture émise + envoyée par email ✓" });
      } else {
        setMsg({
          kind: "ok",
          text: "Facture émise. " + (res.warning ?? "Email non envoyé."),
        });
      }
      setTimeout(() => setMsg(null), 5000);
      router.refresh();
    });
  }

  function markPaid() {
    startTransition(async () => {
      const res = await markInvoicePaid(invoice.id);
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else router.refresh();
    });
  }

  function transition(next: InvoiceStatus) {
    startTransition(async () => {
      const res = await setInvoiceStatus(invoice.id, next);
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else router.refresh();
    });
  }

  function doDelete() {
    if (!window.confirm("Supprimer ce brouillon ? Irréversible.")) return;
    startTransition(async () => {
      const res = await deleteInvoice(invoice.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.replace("/dashboard/factures");
    });
  }

  function issueCreditNote() {
    startTransition(async () => {
      const res = await createCreditNote(invoice.id, creditReason.trim() || null);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setCreditModal(false);
      router.push(`/dashboard/factures/${res.creditNoteId}`);
    });
  }

  function remind() {
    const prev = invoice.reminder_count ?? 0;
    const label =
      prev === 0
        ? "Envoyer une relance au client par email ?"
        : `Envoyer une nouvelle relance (${prev + 1}e) au client par email ?`;
    if (!window.confirm(label)) return;
    startTransition(async () => {
      setMsg(null);
      const res = await sendInvoiceReminder(invoice.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      if (res.emailed) {
        setMsg({ kind: "ok", text: "Relance envoyée par email ✓" });
      } else {
        setMsg({
          kind: "ok",
          text: "Relance enregistrée. " + (res.warning ?? ""),
        });
      }
      setTimeout(() => setMsg(null), 5000);
      router.refresh();
    });
  }

  // ─── Item ops ───
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        localId: uid(),
        title: "",
        description: "",
        qty: 1,
        unit: "unité",
        unit_price_ht: 0,
      },
    ]);
  }
  function patchItem(localId: string, patch: Partial<EditableItem>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)),
    );
  }
  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <TopBar
        invoice={invoice}
        dirty={isDirty}
        pending={pending}
        canIssueCreditNote={canIssueCreditNote}
        canRemind={canRemind}
        onSave={save}
        onSend={send}
        onMarkPaid={markPaid}
        onCancel={() => transition("annule")}
        onDelete={doDelete}
        onOpenCreditNote={() => {
          setCreditReason("");
          setCreditModal(true);
        }}
        onRemind={remind}
      />

      {isCreditNote && sourceInvoice && (
        <div className="mt-3 rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2 text-xs text-violet-700 dark:text-violet-200 flex items-center justify-between gap-3">
          <span>
            Avoir rattaché à la facture{" "}
            <Link
              href={`/dashboard/factures/${sourceInvoice.id}`}
              className="font-medium underline decoration-dotted underline-offset-4"
            >
              {sourceInvoice.number}
            </Link>
            {invoice.credit_note_reason ? ` · motif : ${invoice.credit_note_reason}` : ""}
          </span>
        </div>
      )}

      {!isCreditNote && creditNotes.length > 0 && (
        <div className="mt-3 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 mb-1">
            Avoirs émis
          </p>
          <ul className="space-y-1">
            {creditNotes.map((cn) => (
              <li key={cn.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/dashboard/factures/${cn.id}`}
                  className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white"
                >
                  <ExternalLink className="h-3 w-3" /> {cn.number}
                  <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                    · {cn.status}
                  </span>
                </Link>
                <span className="font-medium text-violet-700 dark:text-violet-200">
                  {formatEUR(Number(cn.total_ttc))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/40 bg-red-500/10 text-red-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      {readOnly && (
        <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-200">
          Facture verrouillée ({invoice.status}). Pour toute modification, émets
          un avoir — une facture émise est immuable (art. 242 nonies A du CGI).
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <div className="space-y-5">
          <Card title="Sujet">
            <LabeledInput
              label="Sujet (apparaît en haut de la facture)"
              value={subject}
              onChange={setSubject}
              readOnly={readOnly}
              placeholder="Facture — Mariage Dubois 14/06/2026"
            />
          </Card>

          <Card title="Dates">
            <Row3>
              <LabeledInput
                label="Émission"
                type="date"
                value={issueDate}
                onChange={setIssueDate}
                readOnly={readOnly}
              />
              <LabeledInput
                label="Échéance"
                type="date"
                value={dueDate}
                onChange={setDueDate}
                readOnly={readOnly}
              />
              <LabeledInput
                label="Date prestation"
                type="date"
                value={eventDate}
                onChange={setEventDate}
                readOnly={readOnly}
              />
            </Row3>
          </Card>

          <Card title="Prestations">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-500">
                Aucune ligne.
                {!readOnly && (
                  <>
                    {" "}
                    <button onClick={addItem} className="text-slate-600 dark:text-slate-300 underline">
                      Ajouter la première ligne
                    </button>
                  </>
                )}
              </p>
            ) : (
              <>
                <div className="divide-y divide-slate-100 dark:divide-slate-900">
                  {items.map((it) => (
                    <ItemRow
                      key={it.localId}
                      item={it}
                      readOnly={readOnly}
                      onPatch={(patch) => patchItem(it.localId, patch)}
                      onRemove={() => removeItem(it.localId)}
                    />
                  ))}
                </div>
                {!readOnly && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={addItem}
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                    >
                      <Plus className="h-3 w-3" /> Ajouter une ligne
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card title="Mentions / conditions de paiement">
            <LabeledTextarea
              label="Mentions complémentaires"
              value={terms}
              onChange={setTerms}
              readOnly={readOnly}
              rows={3}
              placeholder="Paiement par virement, RIB ci-joint. Escompte 2% sous 8j."
            />
          </Card>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Totaux
            </p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-500">Total HT</dt>
                <dd className="font-medium text-slate-900 dark:text-slate-100">{formatEUR(totalHt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-slate-500 dark:text-slate-500">
                  TVA
                  <input
                    type="number"
                    value={tvaRate}
                    step="0.01"
                    min="0"
                    onChange={(e) => setTvaRate(e.target.value)}
                    disabled={readOnly}
                    className="w-14 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-1.5 py-0.5 text-right text-xs text-slate-900 dark:text-slate-100 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
                  />
                  %
                </dt>
                <dd className="text-slate-700 dark:text-slate-200">{formatEUR(totalTva)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 text-base font-semibold">
                <dt className="text-slate-600 dark:text-slate-300">Total TTC</dt>
                <dd className="text-slate-900 dark:text-white">{formatEUR(totalTtc)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5 text-xs text-slate-500 dark:text-slate-500">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Workflow
            </p>
            <ul className="space-y-1 leading-relaxed">
              <li>brouillon → envoyée (figé)</li>
              <li>envoyée → payée / en retard</li>
              <li>payée / annulée = terminal</li>
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed">
              Pour corriger une facture émise, clique « Avoir ».
            </p>
          </div>
        </aside>
      </div>

      {creditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Émettre un avoir
                </p>
                <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Sur la facture {invoice.number}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCreditModal(false)}
                className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              L&apos;avoir duplique les lignes en quantités négatives (TTC{" "}
              {formatEUR(-Number(invoice.total_ttc))}). Tu pourras l&apos;ajuster
              en brouillon avant émission — par ex. avoir partiel.
            </p>
            <LabeledTextarea
              label="Motif (apparaît sur l'avoir)"
              value={creditReason}
              onChange={setCreditReason}
              rows={2}
              placeholder="Geste commercial suite à prestation écourtée, etc."
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreditModal(false)}
                disabled={pending}
                className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={issueCreditNote}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                Créer l&apos;avoir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function serialize(p: SaveInvoiceInput): string {
  return JSON.stringify(p);
}

/* ─── Top bar (status + actions) ─────────────────────────────────── */

function TopBar({
  invoice,
  dirty,
  pending,
  canIssueCreditNote,
  canRemind,
  onSave,
  onSend,
  onMarkPaid,
  onCancel,
  onDelete,
  onOpenCreditNote,
  onRemind,
}: {
  invoice: Invoice;
  dirty: boolean;
  pending: boolean;
  canIssueCreditNote: boolean;
  canRemind: boolean;
  onSave: () => void;
  onSend: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onOpenCreditNote: () => void;
  onRemind: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-900 pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
          {invoice.is_credit_note ? "Avoir" : "Facture"}
        </p>
        <h1 className="font-display text-2xl text-slate-900 dark:text-white md:text-3xl">{invoice.number}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
          <StatusPill status={invoice.status} />
          {invoice.sent_at && (
            <span>Émise le {new Date(invoice.sent_at).toLocaleDateString("fr-FR")}</span>
          )}
          {invoice.paid_at && (
            <span>Payée le {new Date(invoice.paid_at).toLocaleDateString("fr-FR")}</span>
          )}
          {(invoice.reminder_count ?? 0) > 0 && invoice.last_reminded_at && (
            <span className="text-amber-700 dark:text-amber-300/80">
              · {invoice.reminder_count} relance{(invoice.reminder_count ?? 0) > 1 ? "s" : ""} · dernière le{" "}
              {new Date(invoice.last_reminded_at).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {invoice.status === "brouillon" && (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !dirty}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:border-slate-300 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {dirty ? "Enregistrer" : "Enregistré"}
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={pending || dirty}
              title={dirty ? "Enregistre d'abord" : undefined}
              className="inline-flex items-center gap-2 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3 w-3" /> Figer & envoyer
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 transition-colors hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" /> Supprimer
            </button>
          </>
        )}

        {(invoice.status === "envoye" || invoice.status === "en_retard") && (
          <>
            {canRemind && (
              <button
                type="button"
                onClick={onRemind}
                disabled={pending}
                title={
                  invoice.last_reminded_at
                    ? `Dernière relance : ${new Date(invoice.last_reminded_at).toLocaleDateString("fr-FR")}`
                    : "Aucune relance encore envoyée"
                }
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 disabled:opacity-60"
              >
                <BellRing className="h-3 w-3" />
                Relancer
                {(invoice.reminder_count ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">
                    {invoice.reminder_count}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onMarkPaid}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-500"
            >
              <Euro className="h-3 w-3" /> Marquer payée
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
            >
              <Ban className="h-3 w-3" /> Annuler
            </button>
          </>
        )}

        {invoice.status === "paye" && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <Check className="h-3 w-3" /> Encaissée
          </span>
        )}

        {invoice.status === "annule" && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <XCircle className="h-3 w-3" /> Annulée
          </span>
        )}

        {canIssueCreditNote && (
          <button
            type="button"
            onClick={onOpenCreditNote}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-700 dark:text-violet-200 transition-colors hover:bg-violet-500/20 disabled:opacity-60"
          >
            <RotateCcw className="h-3 w-3" /> Avoir
          </button>
        )}

        <a
          // Public PDF URL — factures post-IDOR ont un access_token requis
          // dans le querystring, sinon 404. Les anciennes factures
          // (access_token = null) gardent un lien nu.
          href={
            (invoice as { access_token?: string | null }).access_token
              ? `/factures/${invoice.number}?t=${(invoice as { access_token?: string | null }).access_token}`
              : `/factures/${invoice.number}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
        >
          <Eye className="h-3 w-3" /> {invoice.is_credit_note ? "Avoir PDF" : "Facture PDF"}
        </a>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { cls: string; label: string }> = {
    brouillon: { cls: "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300", label: "Brouillon" },
    envoye: { cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200", label: "Envoyée" },
    paye: { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Payée" },
    en_retard: { cls: "border-red-500/50 bg-red-500/15 text-red-300", label: "En retard" },
    annule: { cls: "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400", label: "Annulée" },
  };
  const p = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${p.cls}`}>
      {p.label}
    </span>
  );
}

/* ─── Shared primitives ──────────────────────────────────────────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row3({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-3">{children}</div>;
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}

function ItemRow({
  item,
  readOnly,
  onPatch,
  onRemove,
}: {
  item: EditableItem;
  readOnly: boolean;
  onPatch: (patch: Partial<EditableItem>) => void;
  onRemove: () => void;
}) {
  const total = item.qty * item.unit_price_ht;
  return (
    <div className="grid gap-2 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_72px_88px_100px_24px] md:items-start md:gap-3">
      <div className="mt-2 hidden text-slate-400 dark:text-slate-600 md:block">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <div className="space-y-1">
        <input
          type="text"
          value={item.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Intitulé de la prestation"
          readOnly={readOnly}
          className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
        />
        <textarea
          value={item.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Description (optionnelle)"
          rows={1}
          readOnly={readOnly}
          className="w-full resize-y rounded-md border border-slate-200 dark:border-slate-800/70 bg-slate-100 dark:bg-slate-900/60 px-2.5 py-1.5 text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
        />
      </div>
      <input
        type="number"
        min="0"
        step="0.5"
        value={item.qty}
        onChange={(e) => onPatch({ qty: Number(e.target.value) || 0 })}
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
      <input
        type="text"
        value={item.unit}
        onChange={(e) => onPatch({ unit: e.target.value })}
        placeholder="unité"
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-600 dark:text-slate-300 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
      <input
        type="number"
        min="0"
        step="0.01"
        value={item.unit_price_ht}
        onChange={(e) => onPatch({ unit_price_ht: Number(e.target.value) || 0 })}
        readOnly={readOnly}
        className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
      <div className="flex items-center justify-end gap-2 md:flex-col md:items-end md:gap-1 md:pt-1">
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 md:text-[11px]">
          {formatEUR(total)}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded text-slate-500 dark:text-slate-500 transition-colors hover:text-red-300"
            aria-label="Supprimer la ligne"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
