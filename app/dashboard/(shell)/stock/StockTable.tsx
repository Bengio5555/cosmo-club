"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Pencil,
  Plus,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  Search,
  Download,
} from "lucide-react";
import type { Tables, Database } from "@/types/database";
import {
  saveNewProduct,
  saveProduct,
  toggleProductArchived,
  adjustStock,
  type ProductInput,
} from "./actions";
import { formatDateFR, formatEUR } from "@/lib/format";

type Product = Tables<"products">;
type Movement = Pick<
  Tables<"stock_movements">,
  "id" | "product_id" | "qty" | "direction" | "reason" | "created_at" | "event_id"
>;
type Category = Database["public"]["Enums"]["product_category"];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "spiritueux", label: "Spiritueux" },
  { value: "sirops", label: "Sirops" },
  { value: "garnitures", label: "Garnitures" },
  { value: "verrerie", label: "Verrerie" },
  { value: "consommables", label: "Consommables" },
  { value: "tech", label: "Tech" },
];

export function StockTable({
  products,
  movements,
}: {
  products: Product[];
  movements: Movement[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | "new"
    | { edit: Product }
    | { adjust: Product; direction: "in" | "out" }
    | null
  >(null);

  const productsById = new Map(products.map((p) => [p.id, p]));

  // ─── Search filter (client-side, case-insensitive on name + supplier) ───
  const [search, setSearch] = useState("");
  const normalized = search.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalized) return products;
    return products.filter((p) => {
      const haystack = `${p.name} ${p.supplier ?? ""}`.toLowerCase();
      return haystack.includes(normalized);
    });
  }, [products, normalized]);

  function submitNew(form: FormData) {
    setErr(null);
    const input: ProductInput = {
      name: String(form.get("name") || ""),
      category: (form.get("category") as Category) || "spiritueux",
      unit: String(form.get("unit") || "unité"),
      stock_qty: Number(form.get("stock_qty") || 0),
      min_threshold: Number(form.get("min_threshold") || 0),
      cost_ht: form.get("cost_ht") ? Number(form.get("cost_ht")) : null,
      supplier: String(form.get("supplier") || ""),
      notes: String(form.get("notes") || ""),
      content_per_unit: form.get("content_per_unit")
        ? Number(form.get("content_per_unit"))
        : null,
      content_unit: String(form.get("content_unit") || "") || null,
    };
    startTransition(async () => {
      const res = await saveNewProduct(input);
      if (!res.ok) return setErr(res.error);
      setModal(null);
      router.refresh();
    });
  }

  function submitEdit(id: string, form: FormData) {
    setErr(null);
    const patch: Partial<ProductInput> = {
      name: String(form.get("name") || ""),
      category: form.get("category") as Category,
      unit: String(form.get("unit") || "unité"),
      min_threshold: Number(form.get("min_threshold") || 0),
      cost_ht: form.get("cost_ht") ? Number(form.get("cost_ht")) : null,
      supplier: String(form.get("supplier") || ""),
      notes: String(form.get("notes") || ""),
      content_per_unit: form.get("content_per_unit")
        ? Number(form.get("content_per_unit"))
        : null,
      content_unit: String(form.get("content_unit") || "") || null,
    };
    startTransition(async () => {
      const res = await saveProduct(id, patch);
      if (!res.ok) return setErr(res.error);
      setModal(null);
      router.refresh();
    });
  }

  function submitAdjust(
    productId: string,
    direction: "in" | "out",
    form: FormData,
  ) {
    setErr(null);
    const qty = Number(form.get("qty") || 0);
    const reason = String(form.get("reason") || "");
    startTransition(async () => {
      const res = await adjustStock(productId, qty, direction, reason);
      if (!res.ok) return setErr(res.error);
      setModal(null);
      router.refresh();
    });
  }

  function toggleArchive(id: string, currentlyArchived: boolean) {
    startTransition(async () => {
      const res = await toggleProductArchived(id, !currentlyArchived);
      if (!res.ok) setErr(res.error);
      else router.refresh();
    });
  }

  // Group products by category for display. Filtered by the search box.
  const grouped = new Map<Category, Product[]>();
  for (const p of filteredProducts) {
    if (p.archived) continue;
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }
  const archived = filteredProducts.filter((p) => p.archived);

  const lowStockCount = products.filter(
    (p) => !p.archived && Number(p.stock_qty) <= Number(p.min_threshold ?? 0),
  ).length;

  // Inventory value (all non-archived products, qty × cost_ht).
  // Surfaced in the toolbar and exported via the CSV button.
  const totalValueHt = products
    .filter((p) => !p.archived && p.cost_ht != null)
    .reduce(
      (sum, p) => sum + Number(p.stock_qty ?? 0) * Number(p.cost_ht ?? 0),
      0,
    );

  function exportStockCsv() {
    // BOM so Excel opens UTF-8 cleanly; ; separator = French locale.
    const header = [
      "Nom",
      "Catégorie",
      "Unité",
      "Contenu",
      "Stock",
      "Coût HT (€)",
      "Valeur totale HT (€)",
      "Fournisseur",
      "Archivé",
    ].join(";");
    const rows = products.map((p) => {
      const qty = Number(p.stock_qty ?? 0);
      const cost = p.cost_ht != null ? Number(p.cost_ht) : null;
      const total = cost != null ? qty * cost : null;
      const content =
        p.content_per_unit != null
          ? `${p.content_per_unit} ${p.content_unit ?? ""}`.trim()
          : "";
      return [
        csvEscape(p.name),
        csvEscape(p.category),
        csvEscape(p.unit),
        csvEscape(content),
        formatNumber(qty),
        cost != null ? formatNumber(cost) : "",
        total != null ? formatNumber(total) : "",
        csvEscape(p.supplier ?? ""),
        p.archived ? "oui" : "",
      ].join(";");
    });
    const footer = [
      `"TOTAL valorisation HT (non archivés)"`,
      "",
      "",
      "",
      "",
      "",
      formatNumber(totalValueHt),
      "",
      "",
    ].join(";");
    const csv = "﻿" + [header, ...rows, "", footer].join("\n");
    const today = new Date().toISOString().slice(0, 10);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmo-stock-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-500">
          <span>
            {products.filter((p) => !p.archived).length} produit
            {products.filter((p) => !p.archived).length > 1 ? "s" : ""}
          </span>
          {lowStockCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              <AlertTriangle className="h-3 w-3" /> {lowStockCount} sous seuil
            </span>
          )}
          <span className="rounded-full border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
            Valorisation HT&nbsp;: <strong className="text-slate-900 dark:text-slate-100">{formatEUR(totalValueHt)}</strong>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-500" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 py-2 pl-8 pr-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none md:w-64"
            />
          </div>
          <button
            type="button"
            onClick={exportStockCsv}
            title="Exporter la valorisation du stock pour la compta (CSV Excel)"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-600"
          >
            <Download className="h-3.5 w-3.5" /> Export compta
          </button>
          <button
            type="button"
            onClick={() => setModal("new")}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-200">
          {err}
        </div>
      )}

      <div className="space-y-4">
        {CATEGORIES.filter((c) => grouped.has(c.value)).map((c) => (
          <div
            key={c.value}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none"
          >
            <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {c.label}
            </div>
            <table className="w-full text-left text-sm">
              <tbody>
                {grouped.get(c.value)!.map((p) => {
                  const low =
                    Number(p.stock_qty) <= Number(p.min_threshold ?? 0);
                  return (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900"
                    >
                      <td className="px-3 py-3 md:px-4">
                        <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                        {p.supplier && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-500">
                            {p.supplier}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400 md:px-4">
                        {p.unit}
                      </td>
                      <td className="px-3 py-3 text-right md:px-4">
                        <span
                          className={`font-medium ${low ? "text-amber-700 dark:text-amber-300" : "text-slate-700 dark:text-slate-200"}`}
                        >
                          {Number(p.stock_qty)}
                        </span>
                        {p.min_threshold > 0 && (
                          <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-600">
                            / {p.min_threshold}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 text-right text-xs text-slate-500 dark:text-slate-400 md:table-cell md:px-4">
                        {p.cost_ht != null
                          ? `${formatEUR(Number(p.cost_ht))} / ${p.unit}`
                          : "—"}
                      </td>
                      <td className="px-3 py-3 text-right md:px-4">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ adjust: p, direction: "in" })
                            }
                            disabled={pending}
                            title="Entrée stock"
                            className="rounded p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                          >
                            <ArrowUpCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ adjust: p, direction: "out" })
                            }
                            disabled={pending}
                            title="Sortie stock"
                            className="rounded p-1.5 text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            <ArrowDownCircle className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setModal({ edit: p })}
                            disabled={pending}
                            className="rounded p-1.5 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                            aria-label="Modifier"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleArchive(p.id, p.archived)}
                            disabled={pending}
                            className="rounded p-1.5 text-slate-500 dark:text-slate-500 transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-neutral-200"
                            aria-label="Archiver"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}

        {products.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucun produit pour l&apos;instant. Clique « Ajouter » pour commencer.
          </div>
        )}
        {products.length > 0 && grouped.size === 0 && archived.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-8 text-center text-sm text-slate-500 dark:text-slate-500">
            Aucun produit ne correspond à « {search} ».
          </div>
        )}

        {archived.length > 0 && (
          <details className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
            <summary className="cursor-pointer px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500 hover:text-neutral-300">
              Archivés · {archived.length}
            </summary>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900">
              {archived.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2 text-sm opacity-60"
                >
                  <span>{p.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleArchive(p.id, true)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <ArchiveRestore className="h-3 w-3" /> Désarchiver
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        {/* Movement log */}
        {movements.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Historique des mouvements · 50 dernières
            </p>
            <ul className="divide-y divide-slate-100 dark:divide-slate-900 text-sm">
              {movements.map((m) => {
                const product = productsById.get(m.product_id);
                return (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    {m.direction === "in" ? (
                      <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ArrowDownCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    )}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {product?.name ?? "—"}
                    </span>
                    <span
                      className={`font-medium ${m.direction === "in" ? "text-emerald-700 dark:text-emerald-300" : "text-red-300"}`}
                    >
                      {m.direction === "in" ? "+" : "−"}
                      {Number(m.qty)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-500 dark:text-slate-500">
                      {m.reason || (m.event_id ? "clôture événement" : "—")}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-600">
                      {formatDateFR(m.created_at, { withTime: true })}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>

      {modal === "new" && (
        <ProductModal
          product={null}
          pending={pending}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={submitNew}
        />
      )}
      {modal && typeof modal === "object" && "edit" in modal && (
        <ProductModal
          product={modal.edit}
          pending={pending}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={(form) => submitEdit(modal.edit.id, form)}
        />
      )}
      {modal && typeof modal === "object" && "adjust" in modal && (
        <AdjustModal
          product={modal.adjust}
          direction={modal.direction}
          pending={pending}
          onClose={() => {
            setErr(null);
            setModal(null);
          }}
          onSubmit={(form) =>
            submitAdjust(modal.adjust.id, modal.direction, form)
          }
        />
      )}
    </>
  );
}

function ProductModal({
  product,
  pending,
  onClose,
  onSubmit,
}: {
  product: Product | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  const isEdit = !!product;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              {isEdit ? "Modifier" : "Nouveau"}
            </p>
            <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
              {isEdit ? product!.name : "Produit"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-3">
          <Field label="Nom">
            <input
              name="name"
              required
              defaultValue={product?.name ?? ""}
              autoFocus
              className={inputCls}
            />
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Catégorie">
              <select
                name="category"
                defaultValue={product?.category ?? "spiritueux"}
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unité">
              <input
                name="unit"
                defaultValue={product?.unit ?? "btl"}
                placeholder="btl, kg, unité…"
                className={inputCls}
              />
            </Field>
          </div>

          {!isEdit && (
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Stock initial">
                <input
                  type="number"
                  name="stock_qty"
                  step="1"
                  min="0"
                  defaultValue="0"
                  className={inputCls}
                />
              </Field>
              <Field label="Seuil min.">
                <input
                  type="number"
                  name="min_threshold"
                  step="1"
                  min="0"
                  defaultValue="0"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {isEdit && (
            <Field label="Seuil min.">
              <input
                type="number"
                name="min_threshold"
                step="1"
                min="0"
                defaultValue={product!.min_threshold ?? 0}
                className={inputCls}
              />
            </Field>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Coût HT (€)">
              <input
                type="number"
                step="0.01"
                min="0"
                name="cost_ht"
                defaultValue={product?.cost_ht ?? ""}
                className={inputCls}
              />
            </Field>
            <Field label="Fournisseur">
              <input
                name="supplier"
                defaultValue={product?.supplier ?? ""}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_120px]">
            <Field label="Contenu par unité (pour recettes)">
              <input
                type="number"
                step="0.01"
                min="0"
                name="content_per_unit"
                defaultValue={product?.content_per_unit ?? ""}
                placeholder="ex: 70 pour une bouteille 70cl"
                className={inputCls}
              />
            </Field>
            <Field label="Unité contenu">
              <select
                name="content_unit"
                defaultValue={product?.content_unit ?? ""}
                className={inputCls}
              >
                <option value="">—</option>
                <option value="cl">cl</option>
                <option value="g">g</option>
                <option value="pc">pc</option>
              </select>
            </Field>
          </div>
          <p className="-mt-1 text-[10px] text-slate-400 dark:text-slate-600">
            Optionnel · utilisé par le menu cocktails pour calculer le stock
            nécessaire à un événement (ex: 1 btl = 70 cl).
          </p>

          <Field label="Notes internes">
            <textarea
              name="notes"
              rows={2}
              defaultValue={product?.notes ?? ""}
              className={inputCls}
            />
          </Field>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
            <button
              type="button"
              onClick={onClose}
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
              {isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjustModal({
  product,
  direction,
  pending,
  onClose,
  onSubmit,
}: {
  product: Product;
  direction: "in" | "out";
  pending: boolean;
  onClose: () => void;
  onSubmit: (form: FormData) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-2xl">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
              {direction === "in" ? "Entrée de stock" : "Sortie de stock"}
            </p>
            <h2 className="mt-1 font-display text-lg text-slate-900 dark:text-white">
              {product.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
              Stock actuel : {product.stock_qty} {product.unit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form action={onSubmit} className="space-y-3">
          <Field label={`Quantité (${product.unit})`}>
            <input
              type="number"
              name="qty"
              step="1"
              min="1"
              required
              autoFocus
              className={inputCls}
            />
          </Field>
          <Field
            label={
              direction === "in" ? "Motif (facultatif)" : "Motif (casse, dégustation…)"
            }
          >
            <input
              name="reason"
              placeholder={direction === "in" ? "Réappro fournisseur X" : "Casse / dégustation"}
              className={inputCls}
            />
          </Field>

          <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-900 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-white transition-colors disabled:opacity-60 ${
                direction === "in"
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-red-600 hover:bg-red-500"
              }`}
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              Valider
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none";

function csvEscape(s: string): string {
  // CSV cells containing ; " or \n need quoting; embedded quotes get doubled.
  const needsQuote = /[;"\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function formatNumber(n: number): string {
  // French decimal comma for direct Excel-FR import.
  return n.toFixed(2).replace(".", ",");
}

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

