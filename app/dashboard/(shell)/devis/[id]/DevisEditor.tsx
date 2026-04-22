"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Check,
  Loader2,
  Send,
  Undo2,
  XCircle,
  Eye,
  GripVertical,
} from "lucide-react";
import type { Database, Tables } from "@/types/database";
import { formatEUR } from "@/lib/format";
import {
  saveQuote,
  setQuoteStatus,
  sendDevis,
  deleteQuote,
  createInvoiceFromQuote,
  type SaveQuoteInput,
} from "./actions";
import { CatalogPicker, type PickedItem } from "./CatalogPicker";
import { Receipt, CalendarPlus } from "lucide-react";
import { createEventFromQuote } from "../../events/actions";

type Quote = Tables<"quotes">;
type QuoteItem = Tables<"quote_items">;
type QuoteStatus = Database["public"]["Enums"]["quote_status"];
type EventType = Database["public"]["Enums"]["event_type"];

// Locally-edited item shape. `localId` is a stable React key that covers both
// existing rows (uses DB id) and freshly-added rows (uuid generated here).
type EditableItem = {
  localId: string;
  dbId?: string;
  section: string;
  title: string;
  description: string;
  qty: number;
  unit: string;
  unit_price_ht: number;
};

const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "mariage", label: "Mariage" },
  { value: "corporate", label: "Corporate" },
  { value: "prive", label: "Soirée privée" },
  { value: "defile", label: "Défilé / Mode" },
  { value: "lancement", label: "Lancement" },
  { value: "autre", label: "Autre" },
];

const DEFAULT_SECTIONS = ["Bar à cocktails", "Barista", "Logistique"];

function uid() {
  return `new-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function DevisEditor({
  quote,
  items: initialItems,
}: {
  quote: Quote;
  items: QuoteItem[];
}) {
  const router = useRouter();
  const readOnly = quote.status !== "brouillon";

  // ─── Metadata state ────────────────────────────────────────
  const [subject, setSubject] = useState(quote.subject ?? "");
  const [intro, setIntro] = useState(quote.intro ?? "");
  const [terms, setTerms] = useState(quote.terms ?? "");
  const [eventType, setEventType] = useState<EventType | "">(
    quote.event_type ?? "",
  );
  const [eventDate, setEventDate] = useState<string>(
    quote.event_date ? quote.event_date.slice(0, 10) : "",
  );
  const [eventLocation, setEventLocation] = useState(quote.event_location ?? "");
  const [guestsCount, setGuestsCount] = useState<string>(
    quote.guests_count != null ? String(quote.guests_count) : "",
  );
  const [tvaRate, setTvaRate] = useState<string>(String(quote.tva_rate ?? 20));
  const [validUntil, setValidUntil] = useState<string>(
    quote.valid_until ? quote.valid_until.slice(0, 10) : "",
  );

  // ─── Items state ───────────────────────────────────────────
  const [items, setItems] = useState<EditableItem[]>(() =>
    initialItems
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        localId: i.id,
        dbId: i.id,
        section: i.section ?? "",
        title: i.title ?? "",
        description: i.description ?? "",
        qty: Number(i.qty ?? 1),
        unit: i.unit ?? "unité",
        unit_price_ht: Number(i.unit_price_ht ?? 0),
      })),
  );

  // ─── Live totals ───────────────────────────────────────────
  const totalHt = useMemo(
    () => round2(items.reduce((s, it) => s + it.qty * it.unit_price_ht, 0)),
    [items],
  );
  const tvaNum = Number(tvaRate) || 0;
  const totalTva = round2((totalHt * tvaNum) / 100);
  const totalTtc = round2(totalHt + totalTva);

  // ─── Save / status transitions ─────────────────────────────
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // Track dirty state so the Save button only lights up when needed.
  // NB: we can't call toPayload() in the useState initializer because
  // toPayload closes over `tvaNum` which is declared above — that used to
  // work only by accident of hoisting order. Lazily seed on mount instead.
  const [baseline, setBaseline] = useState<string>("");
  useEffect(() => {
    setBaseline(serialize(toPayload()));
    // Intentionally empty deps: we only seed once on mount. Subsequent
    // rebase happens after a successful save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isDirty = baseline !== "" && serialize(toPayload()) !== baseline;

  function toPayload(): SaveQuoteInput {
    return {
      subject: subject.trim() || null,
      intro: intro.trim() || null,
      terms: terms.trim() || null,
      event_type: (eventType || null) as EventType | null,
      event_date: eventDate || null,
      event_location: eventLocation.trim() || null,
      guests_count: guestsCount ? Number(guestsCount) : null,
      tva_rate: tvaNum,
      valid_until: validUntil || null,
      items: items.map((it, i) => ({
        id: it.dbId,
        position: i,
        section: it.section.trim() || null,
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
      const res = await saveQuote(quote.id, payload);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setBaseline(serialize(payload));
      setMsg({ kind: "ok", text: "Devis enregistré." });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  function transition(next: QuoteStatus) {
    startTransition(async () => {
      setMsg(null);
      const res = await setQuoteStatus(quote.id, next);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function send() {
    startTransition(async () => {
      setMsg(null);
      const res = await sendDevis(quote.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      if (res.emailed) {
        setMsg({ kind: "ok", text: "Devis envoyé par email ✓" });
      } else {
        setMsg({
          kind: "ok",
          text:
            "Devis figé. " +
            (res.warning ?? "Email non envoyé."),
        });
      }
      setTimeout(() => setMsg(null), 5000);
      router.refresh();
    });
  }

  function doDelete() {
    if (!window.confirm("Supprimer ce brouillon ? Irréversible.")) return;
    startTransition(async () => {
      const res = await deleteQuote(quote.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.replace("/dashboard/devis");
    });
  }

  function createInvoice() {
    startTransition(async () => {
      setMsg(null);
      const res = await createInvoiceFromQuote(quote.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.push(`/dashboard/factures/${res.invoiceId}`);
    });
  }

  function createEvent() {
    startTransition(async () => {
      setMsg(null);
      // Success path redirects inside the server action. If we get here,
      // it failed and returned a structured error.
      const res = await createEventFromQuote(quote.id);
      if (res && !res.ok) {
        setMsg({ kind: "err", text: res.error });
      }
    });
  }

  // ─── Item operations ───────────────────────────────────────
  function addItem(section: string) {
    setItems((prev) => [
      ...prev,
      {
        localId: uid(),
        section,
        title: "",
        description: "",
        qty: 1,
        unit: "unité",
        unit_price_ht: 0,
      },
    ]);
  }

  function patchItem(localId: string, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it)));
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  function addSection(name: string) {
    if (!name.trim()) return;
    addItem(name.trim());
  }

  // Bulk-add from the catalog: each picked item becomes a fresh editable
  // line. If targetSection is provided, it overrides each item's original
  // section (matches the picker UX where the user chooses "Ajouter à la
  // section X"). Items are appended at the bottom of the list; the
  // section grouping in the UI will pull them into place.
  function addFromCatalog(picks: PickedItem[], targetSection: string | null) {
    setItems((prev) => [
      ...prev,
      ...picks.map<EditableItem>((p) => ({
        localId: uid(),
        section: (targetSection ?? p.section) ?? "",
        title: p.title,
        description: p.description ?? "",
        qty: 1,
        unit: p.unit ?? "unité",
        unit_price_ht: Number(p.unit_price_ht) || 0,
      })),
    ]);
  }

  // Group items by their section for display.
  const grouped = useMemo(() => {
    const map = new Map<string, EditableItem[]>();
    for (const it of items) {
      const key = it.section || "Autres";
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    return [...map.entries()];
  }, [items]);

  const knownSections = useMemo(() => {
    const s = new Set(DEFAULT_SECTIONS);
    for (const it of items) if (it.section) s.add(it.section);
    return [...s];
  }, [items]);

  const tvaDisabled = readOnly;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <TopBar
        quote={quote}
        dirty={isDirty}
        pending={pending}
        onSave={save}
        onSend={send}
        onAccept={() => transition("accepte")}
        onRefuse={() => transition("refuse")}
        onReopen={() => transition("brouillon")}
        onDelete={doDelete}
        onCreateInvoice={createInvoice}
        onCreateEvent={createEvent}
      />

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

      <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        {/* ─── Main column: editor ──────────────────────────── */}
        <div className="space-y-5">
          <Card title="Sujet & intro">
            <LabeledInput
              label="Sujet (utilisé comme titre du devis)"
              value={subject}
              onChange={setSubject}
              readOnly={readOnly}
              placeholder="Devis — Mariage Dubois"
            />
            <LabeledTextarea
              label="Intro"
              value={intro}
              onChange={setIntro}
              readOnly={readOnly}
              rows={3}
              placeholder="Quelques lignes de contexte visibles sur la plaquette."
            />
          </Card>

          <Card title="Événement">
            <Row2>
              <LabeledSelect
                label="Type"
                value={eventType}
                onChange={(v) => setEventType(v as EventType | "")}
                options={[
                  { value: "", label: "—" },
                  ...EVENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
                ]}
                readOnly={readOnly}
              />
              <LabeledInput
                label="Date"
                type="date"
                value={eventDate}
                onChange={setEventDate}
                readOnly={readOnly}
              />
            </Row2>
            <Row2>
              <LabeledInput
                label="Lieu"
                value={eventLocation}
                onChange={setEventLocation}
                readOnly={readOnly}
                placeholder="Paris 8 — Hôtel de Crillon"
              />
              <LabeledInput
                label="Invités"
                type="number"
                value={guestsCount}
                onChange={setGuestsCount}
                readOnly={readOnly}
              />
            </Row2>
          </Card>

          <Card
            title="Prestations"
            action={
              !readOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <CatalogPicker onPick={addFromCatalog} />
                  <AddSectionButton
                    onAdd={addSection}
                    knownSections={knownSections.filter(
                      (s) => !grouped.some(([g]) => g === s),
                    )}
                  />
                </div>
              )
            }
          >
            {grouped.length === 0 ? (
              <p className="py-6 text-center text-sm text-neutral-500">
                Aucune prestation.{" "}
                {!readOnly && (
                  <button
                    onClick={() => addItem(DEFAULT_SECTIONS[0])}
                    className="text-neutral-300 underline"
                  >
                    Ajouter la première ligne
                  </button>
                )}
              </p>
            ) : (
              <div className="space-y-6">
                {grouped.map(([sectionName, sectionItems]) => (
                  <SectionBlock
                    key={sectionName}
                    name={sectionName}
                    items={sectionItems}
                    readOnly={readOnly}
                    onPatch={patchItem}
                    onRemove={removeItem}
                    onAddLine={() => addItem(sectionName)}
                    onPickFromCatalog={addFromCatalog}
                  />
                ))}
              </div>
            )}
          </Card>

          <Card title="Conditions">
            <LabeledTextarea
              label="Mentions / CGV (visibles sur la plaquette)"
              value={terms}
              onChange={setTerms}
              readOnly={readOnly}
              rows={4}
              placeholder="Acompte 30% à la signature, solde 7 jours avant l'événement…"
            />
          </Card>
        </div>

        {/* ─── Right sidebar: totals + meta ──────────────────── */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Totaux
            </p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500">Total HT</dt>
                <dd className="font-medium text-neutral-100">{formatEUR(totalHt)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="flex items-center gap-2 text-neutral-500">
                  TVA
                  <input
                    type="number"
                    value={tvaRate}
                    step="0.01"
                    min="0"
                    onChange={(e) => setTvaRate(e.target.value)}
                    disabled={tvaDisabled}
                    className="w-14 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-right text-xs text-neutral-100 focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
                  />
                  %
                </dt>
                <dd className="text-neutral-200">{formatEUR(totalTva)}</dd>
              </div>
              <div className="flex justify-between border-t border-neutral-800 pt-2 text-base font-semibold">
                <dt className="text-neutral-300">Total TTC</dt>
                <dd className="text-white">{formatEUR(totalTtc)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Validité
            </p>
            <LabeledInput
              label="Valable jusqu'au"
              type="date"
              value={validUntil}
              onChange={setValidUntil}
              readOnly={readOnly}
            />
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5 text-xs text-neutral-500">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Workflow
            </p>
            <ul className="space-y-1 leading-relaxed">
              <li>brouillon → envoyé (figeage)</li>
              <li>envoyé → accepté / refusé</li>
              <li>accepté/refusé → brouillon (ré-ouverture)</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function serialize(p: SaveQuoteInput): string {
  return JSON.stringify(p);
}

/* ─── Top bar (status + actions) ─────────────────────────────────── */

function TopBar({
  quote,
  dirty,
  pending,
  onSave,
  onSend,
  onAccept,
  onRefuse,
  onReopen,
  onDelete,
  onCreateInvoice,
  onCreateEvent,
}: {
  quote: Quote;
  dirty: boolean;
  pending: boolean;
  onSave: () => void;
  onSend: () => void;
  onAccept: () => void;
  onRefuse: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onCreateInvoice: () => void;
  onCreateEvent: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-neutral-900 pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-neutral-500">
          Devis
        </p>
        <h1 className="font-display text-2xl text-white md:text-3xl">{quote.number}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
          <StatusPill status={quote.status} />
          {quote.sent_at && <span>Envoyé le {new Date(quote.sent_at).toLocaleDateString("fr-FR")}</span>}
          {quote.accepted_at && <span>Accepté le {new Date(quote.accepted_at).toLocaleDateString("fr-FR")}</span>}
          {quote.refused_at && <span>Refusé le {new Date(quote.refused_at).toLocaleDateString("fr-FR")}</span>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {quote.status === "brouillon" && (
          <>
            <button
              type="button"
              onClick={onSave}
              disabled={pending || !dirty}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-100 transition-colors hover:border-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
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

        {quote.status === "accepte" && (
          <>
            <button
              type="button"
              onClick={onCreateEvent}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
            >
              <CalendarPlus className="h-3 w-3" /> Créer l&apos;événement
            </button>
            <button
              type="button"
              onClick={onCreateInvoice}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              <Receipt className="h-3 w-3" /> Créer la facture
            </button>
          </>
        )}

        {quote.status === "envoye" && (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              <Check className="h-3 w-3" /> Accepté
            </button>
            <button
              type="button"
              onClick={onRefuse}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-200 transition-colors hover:bg-neutral-700"
            >
              <XCircle className="h-3 w-3" /> Refusé
            </button>
            <button
              type="button"
              onClick={onReopen}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700"
            >
              <Undo2 className="h-3 w-3" /> Rouvrir
            </button>
          </>
        )}

        {(quote.status === "accepte" ||
          quote.status === "refuse" ||
          quote.status === "expire") && (
          <button
            type="button"
            onClick={onReopen}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700"
          >
            <Undo2 className="h-3 w-3" /> Rouvrir en brouillon
          </button>
        )}

        <a
          href={`/devis/${quote.number}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 transition-colors hover:border-neutral-700"
        >
          <Eye className="h-3 w-3" /> Plaquette
        </a>
      </div>
    </div>
  );
}

/* ─── Status pill (local, matches dashboard StatusBadge palette) ─── */
function StatusPill({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, { cls: string; label: string }> = {
    brouillon: { cls: "border-neutral-700 bg-neutral-800 text-neutral-300", label: "Brouillon" },
    envoye: { cls: "border-violet-500/40 bg-violet-500/10 text-violet-200", label: "Envoyé" },
    accepte: { cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200", label: "Accepté" },
    refuse: { cls: "border-rose-500/40 bg-rose-500/10 text-rose-200", label: "Refusé" },
    expire: { cls: "border-neutral-700 bg-neutral-800 text-neutral-400", label: "Expiré" },
  };
  const p = map[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${p.cls}`}>
      {p.label}
    </span>
  );
}

/* ─── Card + inputs primitives ─────────────────────────────────── */

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {title}
        </p>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 md:grid-cols-2">{children}</div>;
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  readOnly,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className="w-full resize-y rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />
    </label>
  );
}

/* ─── Section block with its items table ─────────────────────────── */

function SectionBlock({
  name,
  items,
  readOnly,
  onPatch,
  onRemove,
  onAddLine,
  onPickFromCatalog,
}: {
  name: string;
  items: EditableItem[];
  readOnly: boolean;
  onPatch: (localId: string, patch: Partial<EditableItem>) => void;
  onRemove: (localId: string) => void;
  onAddLine: () => void;
  onPickFromCatalog?: (picks: PickedItem[], targetSection: string | null) => void;
}) {
  const sectionTotal = items.reduce((s, it) => s + it.qty * it.unit_price_ht, 0);

  return (
    <div className="rounded-lg border border-neutral-800/80 bg-neutral-900/40">
      <div className="flex items-center justify-between border-b border-neutral-800/60 px-3 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-300">
          {name}
        </p>
        <p className="text-xs text-neutral-500">{formatEUR(sectionTotal)}</p>
      </div>
      <div className="divide-y divide-neutral-900">
        {items.map((it) => (
          <ItemRow
            key={it.localId}
            item={it}
            readOnly={readOnly}
            onPatch={(patch) => onPatch(it.localId, patch)}
            onRemove={() => onRemove(it.localId)}
          />
        ))}
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-3 border-t border-neutral-800/60 px-3 py-2">
          <button
            type="button"
            onClick={onAddLine}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-neutral-400 transition-colors hover:text-white"
          >
            <Plus className="h-3 w-3" /> Ajouter une ligne
          </button>
          {onPickFromCatalog && (
            <CatalogPicker
              onPick={onPickFromCatalog}
              defaultSection={name}
            />
          )}
        </div>
      )}
    </div>
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
    <div className="grid gap-2 px-3 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_72px_88px_100px_24px] md:items-start md:gap-3">
      <div className="mt-2 hidden text-neutral-600 md:block">
        <GripVertical className="h-3.5 w-3.5" />
      </div>

      <div className="space-y-1">
        <input
          type="text"
          value={item.title}
          onChange={(e) => onPatch({ title: e.target.value })}
          placeholder="Intitulé de la prestation"
          readOnly={readOnly}
          className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1.5 text-sm text-white placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
        />
        <textarea
          value={item.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          placeholder="Description (optionnelle)"
          rows={1}
          readOnly={readOnly}
          className="w-full resize-y rounded-md border border-neutral-800/70 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-300 placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
        />
      </div>

      <input
        type="number"
        min="0"
        step="0.5"
        value={item.qty}
        onChange={(e) => onPatch({ qty: Number(e.target.value) || 0 })}
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-right text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />

      <input
        type="text"
        value={item.unit}
        onChange={(e) => onPatch({ unit: e.target.value })}
        placeholder="unité"
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-300 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />

      <input
        type="number"
        min="0"
        step="0.01"
        value={item.unit_price_ht}
        onChange={(e) => onPatch({ unit_price_ht: Number(e.target.value) || 0 })}
        readOnly={readOnly}
        className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1.5 text-right text-sm text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
      />

      <div className="flex items-center justify-end gap-2 md:flex-col md:items-end md:gap-1 md:pt-1">
        <span className="text-xs font-medium text-neutral-300 md:text-[11px]">
          {formatEUR(total)}
        </span>
        {!readOnly && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded text-neutral-500 transition-colors hover:text-red-300"
            aria-label="Supprimer la ligne"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Add-section button with suggestion list ────────────────────── */

function AddSectionButton({
  onAdd,
  knownSections,
}: {
  onAdd: (name: string) => void;
  knownSections: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-neutral-300 transition-colors hover:border-neutral-700 hover:text-white"
      >
        <Plus className="h-3 w-3" /> Section
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {knownSections.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => {
            onAdd(s);
            setOpen(false);
          }}
          className="rounded-full border border-neutral-800 px-2.5 py-0.5 text-[11px] text-neutral-300 transition-colors hover:border-neutral-600"
        >
          {s}
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(name);
          setOpen(false);
        }}
        className="flex items-center gap-1"
      >
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nouveau"
          className="w-28 rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-neutral-800 px-2 py-1 text-[11px] text-neutral-100 hover:bg-neutral-700"
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-neutral-500 hover:text-neutral-300"
        >
          ×
        </button>
      </form>
    </div>
  );
}
