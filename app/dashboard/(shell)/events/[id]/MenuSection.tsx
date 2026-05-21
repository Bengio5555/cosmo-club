"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calculator,
  Download,
  ListChecks,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
  Wine,
  X,
} from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  addCocktailToMenu,
  updateCocktailQty,
  removeCocktailFromMenu,
  replaceStockFromMenu,
} from "../actions";
import { formatEUR } from "@/lib/format";

type EventStatus = Database["public"]["Enums"]["event_status"];
type MenuRow = Tables<"event_cocktails"> & {
  cocktail: { id: string; name: string; category: string | null };
};
type CocktailOption = Pick<
  Tables<"cocktails">,
  "id" | "name" | "category"
>;
type ComputedLine = {
  productId: string;
  productName: string;
  productCategory: string;
  need: number; // raw need in content unit
  contentUnit: string;
  packUnit: string;
  perUnit: number | null;
  packsNeeded: number;
  stockQty: number;
  shortage: number;
  costPerPack: number | null;
  lineCost: number | null;
};

export function MenuSection({
  eventId,
  eventStatus,
  menu,
  cocktailOptions,
  computed,
  existingReservationCount,
}: {
  eventId: string;
  eventStatus: EventStatus;
  menu: MenuRow[];
  cocktailOptions: CocktailOption[];
  computed: ComputedLine[];
  existingReservationCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showCompute, setShowCompute] = useState(false);

  const readOnly = eventStatus === "termine" || eventStatus === "annule";

  const pickedIds = new Set(menu.map((m) => m.cocktail_id));
  const available = cocktailOptions.filter((c) => !pickedIds.has(c.id));

  function submitAdd(form: FormData) {
    setErr(null);
    const cocktail_id = String(form.get("cocktail_id") || "");
    const qty = Number(form.get("qty_planned") || 0);
    if (!cocktail_id || qty <= 0) {
      setErr("Choisis un cocktail et une quantité > 0.");
      return;
    }
    startTransition(async () => {
      const res = await addCocktailToMenu(eventId, cocktail_id, qty);
      if (!res.ok) return setErr(res.error);
      setAdding(false);
      router.refresh();
    });
  }

  function changeQty(cocktailId: string, qty: number) {
    startTransition(async () => {
      const res = await updateCocktailQty(eventId, cocktailId, qty);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function removeRow(cocktailId: string) {
    if (!window.confirm("Retirer ce cocktail du menu ?")) return;
    startTransition(async () => {
      const res = await removeCocktailFromMenu(eventId, cocktailId);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function applyReservations() {
    const warning =
      existingReservationCount > 0
        ? `Cela remplace les ${existingReservationCount} réservation(s) stock actuelle(s). Continuer ?`
        : "Générer les réservations stock depuis ce menu ?";
    if (!window.confirm(warning)) return;
    startTransition(async () => {
      setErr(null);
      const res = await replaceStockFromMenu(eventId);
      if (!res.ok) return setErr(res.error);
      setShowCompute(false);
      router.refresh();
    });
  }

  const totalCocktails = menu.reduce((s, m) => s + (m.qty_planned ?? 0), 0);
  const totalCostMatière = computed.reduce(
    (s, l) => s + (l.lineCost ?? 0),
    0,
  );
  const hasShortage = computed.some((l) => l.shortage > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
            <Wine className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500" />
            Menu cocktails
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-500">
            {menu.length === 0
              ? "Aucun cocktail prévu."
              : `${menu.length} recette${menu.length > 1 ? "s" : ""} · ${totalCocktails} cocktail${totalCocktails > 1 ? "s" : ""} servis au total`}
          </p>
        </div>
        {menu.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/dashboard/events/${eventId}/courses-pdf`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-200 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:bg-slate-700"
              title="Télécharger la liste de courses en PDF"
            >
              <Download className="h-3 w-3" /> Liste de courses (PDF)
            </a>
            <Link
              href={`/dashboard/events/${eventId}/courses`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 transition-colors hover:border-slate-300 dark:hover:border-slate-700"
              title="Aperçu à l'écran avant téléchargement"
            >
              <ListChecks className="h-3 w-3" /> Aperçu
            </Link>
            {!readOnly && (
              <button
                type="button"
                onClick={() => setShowCompute(true)}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:text-amber-200 transition-colors hover:bg-amber-200 dark:hover:bg-amber-500/20 disabled:opacity-60"
              >
                <Calculator className="h-3 w-3" /> Calculer le stock
              </button>
            )}
          </div>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-xs text-red-800 dark:text-red-200">
          {err}
        </div>
      )}

      {cocktailOptions.length === 0 && (
        <div className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3 text-xs text-slate-500 dark:text-slate-400">
          Aucune recette cocktail dans le catalogue.{" "}
          <Link
            href="/dashboard/cocktails"
            className="text-slate-700 dark:text-slate-200 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Crée d&apos;abord tes recettes →
          </Link>
        </div>
      )}

      {adding && cocktailOptions.length > 0 && (
        <form
          action={submitAdd}
          className="mb-3 space-y-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3"
        >
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_90px]">
            <Field label="Recette">
              <select
                name="cocktail_id"
                defaultValue=""
                autoFocus
                className={inputCls}
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.category ? ` · ${c.category}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Qté à servir">
              <input
                type="number"
                name="qty_planned"
                step="1"
                min="1"
                required
                className={inputCls}
              />
            </Field>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Ajouter
            </button>
          </div>
        </form>
      )}

      {menu.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
          {cocktailOptions.length > 0 && !adding
            ? "Clique « Ajouter un cocktail » pour commencer à composer le menu."
            : ""}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-900">
          {menu.map((m) => (
            <li
              key={m.cocktail_id}
              className="flex items-center gap-3 py-2.5"
            >
              <Link
                href={`/dashboard/cocktails/${m.cocktail_id}`}
                className="min-w-0 flex-1 text-sm font-medium text-slate-900 dark:text-slate-100 transition-colors hover:text-slate-900 dark:hover:text-white"
              >
                {m.cocktail.name}
                {m.cocktail.category && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                    {m.cocktail.category}
                  </span>
                )}
              </Link>
              <QtyField
                initial={String(m.qty_planned ?? 0)}
                disabled={readOnly || pending}
                onCommit={(v) => changeQty(m.cocktail_id, Number(v))}
              />
              <span className="w-16 text-xs text-slate-500 dark:text-slate-500">cocktails</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeRow(m.cocktail_id)}
                  disabled={pending}
                  className="rounded p-1 text-slate-500 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-500/10 hover:text-red-300"
                  aria-label="Retirer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && cocktailOptions.length > 0 && !adding && (
        <button
          type="button"
          onClick={() => {
            setErr(null);
            setAdding(true);
          }}
          disabled={pending || available.length === 0}
          className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
        >
          <Plus className="h-3 w-3" /> Ajouter un cocktail
        </button>
      )}

      {/* Compute modal */}
      {showCompute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                  Calcul stock
                </p>
                <h3 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
                  Besoins pour {totalCocktails} cocktails
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCompute(false)}
                className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {hasShortage && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-300 dark:border-amber-500/40 bg-amber-100 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Certains produits manquent en stock. Réappro à prévoir avant
                  le jour J — les lignes en rouge ci-dessous.
                </span>
              </div>
            )}

            {computed.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-500">
                Aucun ingrédient calculable — vérifie que tes recettes ont bien
                des ingrédients.
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-transparent dark:text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Produit</th>
                    <th className="px-2 py-2 text-right font-medium">Besoin</th>
                    <th className="px-2 py-2 text-right font-medium">Packs</th>
                    <th className="px-2 py-2 text-right font-medium">Stock</th>
                    <th className="px-2 py-2 text-right font-medium">Coût</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.map((l) => {
                    const short = l.shortage > 0;
                    return (
                      <tr
                        key={l.productId}
                        className={`border-t border-slate-100 dark:border-slate-900 ${short ? "bg-red-50 dark:bg-red-500/5" : ""}`}
                      >
                        <td className="px-2 py-2">
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {l.productName}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
                            {l.productCategory}
                          </p>
                        </td>
                        <td className="px-2 py-2 text-right text-slate-600 dark:text-slate-300">
                          {formatNumber(l.need)} {l.contentUnit}
                        </td>
                        <td className="px-2 py-2 text-right font-medium text-slate-900 dark:text-slate-100">
                          {l.packsNeeded} {l.packUnit}
                        </td>
                        <td
                          className={`px-2 py-2 text-right ${short ? "text-red-700 dark:text-red-300 font-medium" : "text-slate-500 dark:text-slate-400"}`}
                        >
                          {l.stockQty}
                          {short && (
                            <span className="ml-1 text-[10px]">
                              (−{l.shortage})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-[11px] text-slate-500 dark:text-slate-400">
                          {l.lineCost != null
                            ? formatEUR(l.lineCost)
                            : <span className="text-slate-400 dark:text-slate-600">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-800 text-[11px]">
                    <td className="px-2 py-2 text-slate-500 dark:text-slate-500" colSpan={4}>
                      Coût matière estimé
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                      {totalCostMatière > 0 ? formatEUR(totalCostMatière) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}

            {existingReservationCount > 0 && (
              <p className="mt-3 text-[11px] text-amber-400/80">
                ⚠ {existingReservationCount} réservation(s) manuelle(s)
                existe(nt) déjà sur cet événement — elles seront remplacées.
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
              <button
                type="button"
                onClick={() => setShowCompute(false)}
                disabled={pending}
                className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={applyReservations}
                disabled={pending || computed.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white disabled:opacity-60"
              >
                {pending && <Loader2 className="h-3 w-3 animate-spin" />}
                Réserver ces stocks
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function QtyField({
  initial,
  onCommit,
  disabled,
}: {
  initial: string;
  onCommit: (v: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      type="number"
      step="1"
      min="0"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) onCommit(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      disabled={disabled}
      className="w-16 rounded border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
    />
  );
}

function formatNumber(n: number): string {
  // 2 decimals max, strip trailing zeros
  const rounded = Math.round(n * 100) / 100;
  return rounded.toString().replace(/\.?0+$/, "");
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
