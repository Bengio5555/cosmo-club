"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Loader2, PackagePlus, Trash2 } from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  removeReservation,
  reserveProduct,
  updateReservation,
} from "../actions";

type ProductOption = Pick<
  Tables<"products">,
  "id" | "name" | "category" | "unit" | "stock_qty" | "archived"
>;
type Reservation = Tables<"event_stock">;
type EventStatus = Database["public"]["Enums"]["event_status"];
type Category = Database["public"]["Enums"]["product_category"];

const CATEGORY_LABEL: Record<Category, string> = {
  spiritueux: "Spiritueux",
  sirops: "Sirops",
  garnitures: "Garnitures",
  verrerie: "Verrerie",
  consommables: "Consommables",
  tech: "Tech",
};

export function StockSection({
  eventId,
  eventStatus,
  productOptions,
  reservations,
}: {
  eventId: string;
  eventStatus: EventStatus;
  productOptions: ProductOption[];
  reservations: Reservation[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pickedProduct, setPickedProduct] = useState<string>("");

  const readOnly = eventStatus === "termine" || eventStatus === "annule";
  const reservedIds = new Set(reservations.map((r) => r.product_id));
  const productsById = new Map(productOptions.map((p) => [p.id, p]));
  const available = productOptions.filter((p) => !reservedIds.has(p.id));
  const picked = pickedProduct ? productsById.get(pickedProduct) : null;

  function handleAdd(form: FormData) {
    setErr(null);
    const product_id = String(form.get("product_id") || "");
    const qty = Number(form.get("qty") || 0);
    if (!product_id || !qty) {
      setErr("Choisis un produit et une quantité.");
      return;
    }
    startTransition(async () => {
      const res = await reserveProduct(eventId, product_id, qty);
      if (!res.ok) return setErr(res.error);
      setAdding(false);
      setPickedProduct("");
      router.refresh();
    });
  }

  function patch(productId: string, qty: number) {
    startTransition(async () => {
      const res = await updateReservation(eventId, productId, qty);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  function remove(productId: string) {
    if (!window.confirm("Retirer cette réservation ?")) return;
    startTransition(async () => {
      const res = await removeReservation(eventId, productId);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  // Group reservations by category for readability.
  const grouped = new Map<Category, Reservation[]>();
  for (const r of reservations) {
    const product = productsById.get(r.product_id);
    if (!product) continue;
    const arr = grouped.get(product.category) ?? [];
    arr.push(r);
    grouped.set(product.category, arr);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950/60 dark:shadow-none p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Stock réservé</h2>
          <p className="text-[11px] text-slate-500 dark:text-neutral-500">
            {reservations.length} ligne{reservations.length > 1 ? "s" : ""}
            {eventStatus === "termine"
              ? " · déduit du stock à la clôture"
              : eventStatus === "annule"
              ? " · aucun impact stock"
              : " · déduit du stock au clic « Clôturer »"}
          </p>
        </div>
        {!readOnly && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={pending || available.length === 0}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 dark:bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-slate-900 dark:text-white transition-colors hover:bg-neutral-700 disabled:opacity-50"
          >
            <PackagePlus className="h-3 w-3" /> Réserver
          </button>
        )}
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {err}
        </div>
      )}

      {productOptions.length === 0 && (
        <div className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900/60 p-3 text-xs text-slate-500 dark:text-neutral-400">
          Aucun produit dans le stock.{" "}
          <Link
            href="/dashboard/stock"
            className="text-slate-700 dark:text-neutral-200 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Ajoute d&apos;abord tes produits →
          </Link>
        </div>
      )}

      {adding && productOptions.length > 0 && (
        <form
          action={handleAdd}
          className="mb-3 space-y-2 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900/60 p-3"
        >
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_90px]">
            <Field label="Produit">
              <select
                name="product_id"
                value={pickedProduct}
                onChange={(e) => setPickedProduct(e.target.value)}
                className={inputCls}
                autoFocus
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{CATEGORY_LABEL[p.category]}] {p.name} · stock {p.stock_qty} {p.unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={`Qté${picked ? ` (${picked.unit})` : ""}`}>
              <input
                type="number"
                name="qty"
                step="1"
                min="1"
                required
                className={inputCls}
              />
            </Field>
          </div>
          {picked && picked.stock_qty === 0 && (
            <p className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" /> Stock à 0 — réappro à prévoir.
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setPickedProduct("");
              }}
              className="rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-1.5 text-xs text-slate-600 dark:text-neutral-300 hover:border-slate-300 dark:hover:border-neutral-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-md bg-[color:var(--color-grenat)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)] disabled:opacity-60"
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Réserver
            </button>
          </div>
        </form>
      )}

      {reservations.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500 dark:text-neutral-500">
          {productOptions.length > 0 && !adding
            ? "Aucune réservation pour l'instant."
            : ""}
        </p>
      ) : (
        <div className="space-y-3">
          {(Object.keys(CATEGORY_LABEL) as Category[])
            .filter((c) => grouped.has(c))
            .map((cat) => (
              <div key={cat}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-500">
                  {CATEGORY_LABEL[cat]}
                </p>
                <ul className="divide-y divide-slate-100 dark:divide-neutral-900 rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900/40">
                  {grouped.get(cat)!.map((r) => {
                    const product = productsById.get(r.product_id);
                    if (!product) return null;
                    const short = Number(r.qty_reserved) > Number(product.stock_qty);
                    return (
                      <li
                        key={r.product_id}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <span className="flex-1 text-sm text-slate-900 dark:text-neutral-100">
                          {product.name}
                        </span>
                        <ReservationQtyField
                          initial={String(r.qty_reserved)}
                          onCommit={(v) => patch(r.product_id, Number(v))}
                          disabled={readOnly || pending}
                        />
                        <span className="w-10 text-[11px] text-slate-500 dark:text-neutral-500">
                          {product.unit}
                        </span>
                        <span
                          className={`w-24 text-right text-[11px] ${short ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-neutral-500"}`}
                        >
                          {short && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                          stock {product.stock_qty}
                        </span>
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => remove(r.product_id)}
                            disabled={pending}
                            className="rounded p-1 text-slate-500 dark:text-neutral-500 hover:bg-red-500/10 hover:text-red-300"
                            aria-label="Retirer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}

      {eventStatus === "termine" && reservations.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500 dark:text-neutral-500">
          ✓ Stocks déduits automatiquement à la clôture (mouvements OUT visibles
          dans{" "}
          <Link
            href="/dashboard/stock"
            className="text-slate-600 dark:text-neutral-300 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            /stock
          </Link>
          ).
        </p>
      )}
    </section>
  );
}

function ReservationQtyField({
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
      className="w-16 rounded border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2 py-1 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none disabled:opacity-60"
    />
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}
