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
  Copy,
} from "lucide-react";
import type { Database, Tables } from "@/types/database";
import { formatEUR } from "@/lib/format";
import {
  saveQuote,
  setQuoteStatus,
  sendDevis,
  deleteQuote,
  duplicateQuote,
  createInvoiceFromQuote,
  type SaveQuoteInput,
  type ScheduleItem,
} from "./actions";
import { CatalogPicker, type PickedItem } from "./CatalogPicker";
import { MoodboardPicker, type AvailableImage } from "./MoodboardPicker";
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
  discount_ht: number;
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
  clientEmail,
  availableImages,
  moodboardUploads,
}: {
  quote: Quote;
  items: QuoteItem[];
  clientEmail?: string | null;
  availableImages: AvailableImage[];
  moodboardUploads: AvailableImage[];
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
  // Acompte stocké en fraction (0..1) en DB. L'éditeur expose le %
  // (0..100) pour rester aligné sur le langage métier ("30 %").
  const [depositPct, setDepositPct] = useState<string>(() => {
    const raw = Number(quote.deposit_rate ?? 0.5);
    return String(Math.round(raw * 100));
  });
  const initialCommission = Number(quote.commission_rate ?? 0);
  const [commissionEnabled, setCommissionEnabled] = useState(
    initialCommission > 0,
  );
  const [commissionRate, setCommissionRate] = useState<string>(
    initialCommission > 0 ? String(initialCommission) : "20",
  );
  // Global commercial discount % — applied on subtotal HT after
  // per-line discounts and before the agency commission gross-up.
  // Stored as a 5,2 numeric in DB; the editor exposes a plain integer
  // string so empty/invalid input falls back to 0 cleanly.
  const initialDiscountGlobal = Number(
    (quote as { discount_global_pct?: number }).discount_global_pct ?? 0,
  );
  const [discountGlobalEnabled, setDiscountGlobalEnabled] = useState(
    initialDiscountGlobal > 0,
  );
  const [discountGlobalPct, setDiscountGlobalPct] = useState<string>(
    initialDiscountGlobal > 0 ? String(initialDiscountGlobal) : "10",
  );
  const [validUntil, setValidUntil] = useState<string>(
    quote.valid_until ? quote.valid_until.slice(0, 10) : "",
  );
  // Locale of the public plaquette + the accompanying client email.
  // 'fr' is the default for backward compatibility; 'en' is the opt-in
  // path for international clients. PDF and CGV stay in French either
  // way — see lib/i18n/quote-plaquette.ts for the rationale.
  const [language, setLanguage] = useState<"fr" | "en">(
    (quote as { language?: string }).language === "en" ? "en" : "fr",
  );

  // Picked moodboard images for the plaquette. Stored as JSONB
  // (string array of public URLs); coerce defensively on load.
  const [moodboardImages, setMoodboardImages] = useState<string[]>(() => {
    const raw = (quote as { moodboard_images?: unknown }).moodboard_images;
    if (!Array.isArray(raw)) return [];
    return raw.filter((r): r is string => typeof r === "string" && r.trim().length > 0);
  });

  // Run-of-show steps. Stored as JSONB in DB; the column may be null
  // or may contain other shapes if migrated from older data, so we
  // defensively coerce to a clean array on load.
  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const raw = (quote as { schedule?: unknown }).schedule;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((r) =>
        r && typeof r === "object"
          ? {
              time: String(
                (r as { time?: unknown }).time ?? "",
              ),
              label: String(
                (r as { label?: unknown }).label ?? "",
              ),
            }
          : { time: "", label: "" },
      )
      .filter((s) => s.label.trim().length > 0);
  });

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
        discount_ht: Number(i.discount_ht ?? 0),
      })),
  );

  // ─── Live totals ───────────────────────────────────────────
  // Each line: max(0, qty × unit_price_ht − discount_ht). Mirrors the
  // generated-column formula in Postgres so what the editor shows
  // matches what the DB will compute on save.
  const subtotalHt = useMemo(
    () =>
      round2(
        items.reduce(
          (s, it) =>
            s +
            Math.max(0, it.qty * it.unit_price_ht - (it.discount_ht ?? 0)),
          0,
        ),
      ),
    [items],
  );
  const tvaNum = Number(tvaRate) || 0;
  // Effective commission rate used for math: 0 when toggle off, capped
  // at 99 (formula collapses at 100).
  const commissionRateNum = commissionEnabled
    ? Math.min(99, Math.max(0, Number(commissionRate) || 0))
    : 0;
  const commissionFactor =
    commissionRateNum > 0 ? 100 / (100 - commissionRateNum) : 1;
  // Effective global discount % used for the live preview. Must mirror
  // the server clamp in saveQuote() so editor and DB always agree.
  const discountGlobalPctNum = discountGlobalEnabled
    ? Math.min(100, Math.max(0, Number(discountGlobalPct) || 0))
    : 0;
  const discountGlobalAmount = round2(
    subtotalHt * (discountGlobalPctNum / 100),
  );
  const subtotalAfterDiscount = round2(subtotalHt - discountGlobalAmount);
  const totalHt = round2(subtotalAfterDiscount * commissionFactor);
  const commissionAmount = round2(totalHt - subtotalAfterDiscount);
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
      commission_rate: commissionRateNum,
      deposit_rate: Math.min(1, Math.max(0, (Number(depositPct) || 0) / 100)),
      discount_global_pct: discountGlobalEnabled
        ? Math.min(100, Math.max(0, Number(discountGlobalPct) || 0))
        : 0,
      language,
      valid_until: validUntil || null,
      schedule,
      moodboard_images: moodboardImages,
      items: items.map((it, i) => ({
        id: it.dbId,
        position: i,
        section: it.section.trim() || null,
        title: it.title.trim(),
        description: it.description.trim() || null,
        qty: it.qty,
        unit: it.unit.trim() || null,
        unit_price_ht: it.unit_price_ht,
        discount_ht: it.discount_ht ?? 0,
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

  // Two-step send: clicking "Figer & envoyer" opens a small modal so the
  // owner can append CC addresses (apporteur, chef de projet client…).
  // The actual server call still happens in `confirmSend`.
  const [sendOpen, setSendOpen] = useState(false);

  function confirmSend(cc: string[], message: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await sendDevis(quote.id, { cc, message });
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      setSendOpen(false);
      if (res.emailed) {
        const ccCount = res.ccCount ?? 0;
        setMsg({
          kind: "ok",
          text:
            ccCount > 0
              ? `Devis envoyé (+${ccCount} en copie) ✓`
              : "Devis envoyé par email ✓",
        });
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

  function doDuplicate() {
    if (
      !window.confirm(
        "Dupliquer ce devis en nouveau brouillon ? Les lignes, le client et les paramètres sont recopiés ; la date d'événement et l'historique de signature sont remis à zéro.",
      )
    )
      return;
    startTransition(async () => {
      const res = await duplicateQuote(quote.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.push(`/dashboard/devis/${res.id}`);
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
        discount_ht: 0,
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
        discount_ht: 0,
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
    <div className="min-w-0 max-w-full px-4 py-6 md:px-8 md:py-8">
      <TopBar
        quote={quote}
        dirty={isDirty}
        pending={pending}
        onSave={save}
        onSend={() => setSendOpen(true)}
        onAccept={() => transition("accepte")}
        onRefuse={() => transition("refuse")}
        onReopen={() => transition("brouillon")}
        onDelete={doDelete}
        onDuplicate={doDuplicate}
        onCreateInvoice={createInvoice}
        onCreateEvent={createEvent}
      />

      {msg && (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
            msg.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
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
            title="Planning de l'événement"
            action={
              !readOnly && (
                <button
                  type="button"
                  onClick={() =>
                    setSchedule((prev) => [...prev, { time: "", label: "" }])
                  }
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-700 hover:border-slate-400 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
                >
                  + Ajouter une étape
                </button>
              )
            }
          >
            <ScheduleEditor
              steps={schedule}
              onChange={setSchedule}
              readOnly={readOnly}
            />
          </Card>

          <Card
            title="Prestations"
            action={
              !readOnly && (
                <div className="flex flex-wrap items-center gap-2">
                  <CatalogPicker onPick={addFromCatalog} locale={language} />
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
              <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-500">
                Aucune prestation.{" "}
                {!readOnly && (
                  <button
                    onClick={() => addItem(DEFAULT_SECTIONS[0])}
                    className="text-slate-600 dark:text-slate-300 underline"
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
                    catalogLocale={language}
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
              placeholder="Acompte 50% à la signature, solde 7 jours avant l'événement…"
            />
          </Card>

          <Card title="Moodboard de la plaquette">
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
              Choisis jusqu&apos;à 8 photos parmi la galerie événements
              pour personnaliser le moodboard. Vide = visuels par défaut.
              La photo de couverture reste fixe.
            </p>
            <MoodboardPicker
              quoteId={quote.id}
              available={availableImages}
              initialUploads={moodboardUploads}
              value={moodboardImages}
              onChange={setMoodboardImages}
              readOnly={readOnly}
            />
          </Card>
        </div>

        {/* ─── Right sidebar: totals + meta ──────────────────── */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Totaux
            </p>
            <dl className="space-y-1.5 text-sm">
              {(commissionRateNum > 0 || discountGlobalPctNum > 0) && (
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-500">Sous-total HT</dt>
                  <dd className="text-slate-700 dark:text-slate-200">{formatEUR(subtotalHt)}</dd>
                </div>
              )}
              {discountGlobalPctNum > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300/90">
                  <dt>Remise globale ({discountGlobalPctNum}%)</dt>
                  <dd>− {formatEUR(discountGlobalAmount)}</dd>
                </div>
              )}
              {commissionRateNum > 0 && (
                <div className="flex justify-between text-amber-700 dark:text-amber-300/90">
                  <dt>Apporteur ({commissionRateNum}%)</dt>
                  <dd>+ {formatEUR(commissionAmount)}</dd>
                </div>
              )}
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
                    disabled={tvaDisabled}
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

          {/* ─── Global commercial discount (%) ─────────────────
              Applied on the subtotal HT after per-line discounts and
              before the agency commission gross-up, so the commission
              shrinks proportionally with the discount. Default toggle
              off; default rate 10% on enable. */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Remise globale
              </span>
              <input
                type="checkbox"
                checked={discountGlobalEnabled}
                disabled={readOnly}
                onChange={(e) => setDiscountGlobalEnabled(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[color:var(--color-grenat)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            {discountGlobalEnabled ? (
              <>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                  Pourcentage retiré du sous-total HT (après remises
                  ligne) et avant la majoration apporteur. Affiché comme
                  une ligne séparée sur la plaquette et la facture.
                </p>
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={discountGlobalPct}
                    onChange={(e) => setDiscountGlobalPct(e.target.value)}
                    min="0"
                    max="100"
                    step="0.5"
                    disabled={readOnly}
                    className="w-20 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">% de remise</span>
                </label>
                <div className="mt-3 rounded-md border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-800/90 dark:text-emerald-200/90">
                  Économie pour le client&nbsp;:
                  <span className="ml-1 font-semibold">
                    − {formatEUR(discountGlobalAmount)} HT
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                Active pour appliquer une remise commerciale sur
                l&apos;ensemble du devis, en plus des éventuelles
                remises ligne par ligne.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Apporteur d&apos;affaires
              </span>
              <input
                type="checkbox"
                checked={commissionEnabled}
                disabled={readOnly}
                onChange={(e) => setCommissionEnabled(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[color:var(--color-grenat)] disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
            {commissionEnabled ? (
              <>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                  Majoration appliquée pour reverser la commission sans
                  rogner sur la marge. Formule&nbsp;: prix ÷ (1 − x%).
                </p>
                <label className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    min="0"
                    max="99"
                    step="0.5"
                    disabled={readOnly}
                    className="w-20 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">% de commission</span>
                </label>
                <div className="mt-3 rounded-md border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5 px-3 py-2 text-[11px] text-amber-800/90 dark:text-amber-200/90">
                  À reverser à l&apos;apporteur&nbsp;:
                  <span className="ml-1 font-semibold">
                    {formatEUR(round2(totalHt * (commissionRateNum / 100)))} HT
                  </span>
                </div>
              </>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
                Active pour majorer le devis quand un apporteur (agence,
                wedding planner…) prend une commission sur l&apos;affaire.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Acompte à la signature
            </p>
            <label className="flex items-center gap-2">
              <input
                type="number"
                value={depositPct}
                onChange={(e) => setDepositPct(e.target.value)}
                min="0"
                max="100"
                step="1"
                disabled={readOnly}
                className="w-20 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">% du Total TTC</span>
            </label>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
              Affiché en bloc &laquo;&nbsp;Acompte&nbsp;&raquo; sur la
              plaquette et repris dans les emails de confirmation. 50&nbsp;%
              par défaut, ajustable selon le ticket.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
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

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Langue de la plaquette
            </p>
            <div className="flex gap-2">
              {(["fr", "en"] as const).map((lang) => {
                const active = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    disabled={readOnly}
                    className={
                      "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 " +
                      (active
                        ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                        : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white")
                    }
                  >
                    {lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English"}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-500">
              Bascule la plaquette HTML et l&apos;email envoyé au client. Le
              PDF signé et les CGV restent en français.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5 text-xs text-slate-500 dark:text-slate-500">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
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

      {sendOpen && (
        <SendDevisDialog
          quoteNumber={quote.number}
          clientEmail={clientEmail ?? null}
          pending={pending}
          onCancel={() => setSendOpen(false)}
          onConfirm={confirmSend}
        />
      )}
    </div>
  );
}

function SendDevisDialog({
  quoteNumber,
  clientEmail,
  pending,
  onCancel,
  onConfirm,
}: {
  quoteNumber: string;
  clientEmail: string | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: (cc: string[], message: string) => void;
}) {
  const [ccRaw, setCcRaw] = useState("");
  const [message, setMessage] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, pending]);

  function submit() {
    setErr(null);
    // Comma- or whitespace-separated, validated server-side too.
    const parts = ccRaw
      .split(/[\s,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const invalid = parts.filter(
      (p) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p),
    );
    if (invalid.length > 0) {
      setErr(`Adresse(s) invalide(s) : ${invalid.join(", ")}`);
      return;
    }
    if (parts.length > 5) {
      setErr("Maximum 5 adresses en copie.");
      return;
    }
    onConfirm(parts, message);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Envoyer le devis ${quoteNumber}`}
      onClick={() => !pending && onCancel()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-900 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Figer & envoyer
            </p>
            <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
              Devis {quoteNumber}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            aria-label="Fermer"
            className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Destinataire principal
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {clientEmail ? (
                clientEmail
              ) : (
                <span className="text-amber-700 dark:text-amber-300">
                  Aucun email client renseigné — le devis sera figé mais
                  pas envoyé.
                </span>
              )}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Copie (optionnel)
            </span>
            <input
              type="text"
              value={ccRaw}
              onChange={(e) => setCcRaw(e.target.value)}
              placeholder="apporteur@agence.com, autre@client.com"
              autoFocus
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-500">
              Sépare plusieurs adresses par une virgule. Max 5.
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Message personnalisé (optionnel)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Un petit mot, des précisions sur le devis, les prochaines étapes…"
              className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-500">
              Ajouté dans un encadré au-dessus du bouton. Vide = email
              habituel.
            </span>
          </label>

          {err && (
            <p className="rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
              {err}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3 w-3 animate-spin" />}
            <Send className="h-3 w-3" /> Confirmer & envoyer
          </button>
        </div>
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
  onDuplicate,
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
  onDuplicate: () => void;
  onCreateInvoice: () => void;
  onCreateEvent: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-900 pb-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
          Devis
        </p>
        <h1 className="font-display text-2xl text-slate-900 dark:text-white md:text-3xl">{quote.number}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-500">
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
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-3 w-3" /> Figer & envoyer
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-300 transition-colors hover:bg-red-100 dark:hover:bg-red-500/10"
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
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-sky-500 disabled:opacity-60"
            >
              <CalendarPlus className="h-3 w-3" /> Créer l&apos;événement
            </button>
            <button
              type="button"
              onClick={onCreateInvoice}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
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
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors hover:bg-emerald-500"
            >
              <Check className="h-3 w-3" /> Accepté
            </button>
            <button
              type="button"
              onClick={onRefuse}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-700"
            >
              <XCircle className="h-3 w-3" /> Refusé
            </button>
            <button
              type="button"
              onClick={onReopen}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
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
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
          >
            <Undo2 className="h-3 w-3" /> Rouvrir en brouillon
          </button>
        )}

        <a
          // Public plaquette URL — devis post-IDOR ont un access_token
          // requis dans le querystring, sinon la route renvoie 404.
          // Les anciens devis (access_token = null) gardent un lien nu.
          href={
            (quote as { access_token?: string | null }).access_token
              ? `/devis/${quote.number}?t=${(quote as { access_token?: string | null }).access_token}`
              : `/devis/${quote.number}`
          }
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
        >
          <Eye className="h-3 w-3" /> Plaquette
        </a>
        <button
          type="button"
          onClick={onDuplicate}
          disabled={pending}
          title="Créer un brouillon avec les mêmes lignes (même client, dates remises à zéro)"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-900 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white"
        >
          <Copy className="h-3 w-3" /> Dupliquer
        </button>
      </div>
    </div>
  );
}

/* ─── Status pill (local, matches dashboard StatusBadge palette) ─── */
function StatusPill({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, { cls: string; label: string }> = {
    brouillon: { cls: "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300", label: "Brouillon" },
    envoye: { cls: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-200", label: "Envoyé" },
    accepte: { cls: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200", label: "Accepté" },
    refuse: { cls: "border-rose-500/40 bg-rose-500/10 text-rose-200", label: "Refusé" },
    expire: { cls: "border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400", label: "Expiré" },
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
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
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
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <select
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
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

/* ─── Run-of-show editor ─────────────────────────────────────────── */

function ScheduleEditor({
  steps,
  onChange,
  readOnly,
}: {
  steps: ScheduleItem[];
  onChange: (next: ScheduleItem[]) => void;
  readOnly: boolean;
}) {
  // Drag state: index of the row being dragged + the index it would be
  // dropped at. Both refer to positions in `steps`. We re-order on
  // dragEnd to keep the list stable while the user is still moving.
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  function patch(idx: number, p: Partial<ScheduleItem>) {
    onChange(steps.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function remove(idx: number) {
    onChange(steps.filter((_, i) => i !== idx));
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = steps.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  if (steps.length === 0) {
    return (
      <p className="py-2 text-xs text-slate-500 dark:text-slate-500">
        {readOnly
          ? "Aucun planning défini."
          : "Détaille le déroulé : livraison, arrivée invités, fin de prestation, rangement…"}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {steps.map((step, idx) => {
        const isDragging = dragIdx === idx;
        const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx;
        return (
          <li
            key={idx}
            draggable={!readOnly}
            onDragStart={(e) => {
              if (readOnly) return;
              setDragIdx(idx);
              // Mark the drag effect; some browsers need an empty dataTransfer
              // to opt-in to drag.
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(idx));
            }}
            onDragOver={(e) => {
              if (readOnly || dragIdx === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (overIdx !== idx) setOverIdx(idx);
            }}
            onDragLeave={() => {
              if (overIdx === idx) setOverIdx(null);
            }}
            onDrop={(e) => {
              if (readOnly || dragIdx === null) return;
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
              "flex items-center gap-2 rounded-md border bg-slate-100 px-2 py-1.5 transition-colors dark:bg-slate-900/40 " +
              (isOver
                ? "border-[color:var(--color-grenat)] ring-1 ring-[color:var(--color-grenat)]/40"
                : "border-slate-200 dark:border-slate-800/80") +
              (isDragging ? " opacity-50" : "")
            }
          >
            {!readOnly && (
              <span
                aria-label="Glisser pour réordonner"
                title="Glisser pour réordonner"
                className="shrink-0 cursor-grab text-slate-400 active:cursor-grabbing dark:text-slate-500"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
            )}
            <input
              type="time"
              value={step.time}
              onChange={(e) => patch(idx, { time: e.target.value })}
              readOnly={readOnly}
              className="w-[88px] rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
            />
            <input
              type="text"
              value={step.label}
              onChange={(e) => patch(idx, { label: e.target.value })}
              placeholder="Étape (ex. Arrivée invités)"
              readOnly={readOnly}
              className="min-w-0 flex-1 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label="Supprimer l'étape"
                className="shrink-0 rounded p-1 text-slate-500 dark:text-slate-500 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
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
  catalogLocale = "fr",
}: {
  name: string;
  items: EditableItem[];
  readOnly: boolean;
  onPatch: (localId: string, patch: Partial<EditableItem>) => void;
  onRemove: (localId: string) => void;
  onAddLine: () => void;
  onPickFromCatalog?: (picks: PickedItem[], targetSection: string | null) => void;
  catalogLocale?: "fr" | "en";
}) {
  const sectionTotal = items.reduce((s, it) => s + it.qty * it.unit_price_ht, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/60 px-3 py-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
          {name}
        </p>
        <p className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-500">
          {formatEUR(sectionTotal)}
        </p>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-900">
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
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-slate-800/60 px-3 py-2">
          <button
            type="button"
            onClick={onAddLine}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
          >
            <Plus className="h-3 w-3" /> Ajouter une ligne
          </button>
          {onPickFromCatalog && (
            <CatalogPicker
              onPick={onPickFromCatalog}
              defaultSection={name}
              locale={catalogLocale}
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
  const subtotal = item.qty * item.unit_price_ht;
  const discount = Number(item.discount_ht ?? 0);
  const total = Math.max(0, subtotal - discount);
  return (
    <div className="grid gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_56px_60px_84px_72px] md:items-start md:gap-2 lg:grid-cols-[16px_minmax(0,1fr)_60px_64px_92px_88px] lg:gap-3">
      <div className="mt-2 hidden text-slate-400 dark:text-slate-600 lg:block">
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
        <label
          className={`inline-flex items-center gap-1.5 text-[11px] ${
            discount > 0 ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-500"
          }`}
        >
          <span className="uppercase tracking-wide">Remise</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={discount === 0 ? "" : discount}
            placeholder="0"
            onChange={(e) =>
              onPatch({ discount_ht: Number(e.target.value) || 0 })
            }
            readOnly={readOnly}
            className="w-20 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-1.5 py-0.5 text-right text-[11px] text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none read-only:opacity-70"
          />
          <span>€ HT</span>
        </label>
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
        {discount > 0 && (
          <span className="text-[10px] text-amber-700 dark:text-amber-300/80" title="Remise appliquée">
            −{formatEUR(discount)}
          </span>
        )}
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
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1 text-[11px] uppercase tracking-wide text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white"
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
          className="rounded-full border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 text-[11px] text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-400 dark:hover:border-slate-600"
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
          className="w-28 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-[11px] text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-slate-200 dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-900 dark:text-slate-100 hover:bg-slate-700"
        >
          OK
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] text-slate-500 dark:text-slate-500 hover:text-slate-300"
        >
          ×
        </button>
      </form>
    </div>
  );
}
