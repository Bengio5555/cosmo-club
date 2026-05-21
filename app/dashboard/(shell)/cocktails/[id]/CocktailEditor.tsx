"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ArchiveRestore,
  Check,
  GripVertical,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { Tables } from "@/types/database";
import {
  deleteCocktail,
  saveCocktail,
  saveCocktailIngredients,
  toggleCocktailArchived,
  type IngredientInput,
} from "../actions";

type Cocktail = Tables<"cocktails">;
type Ingredient = Tables<"cocktail_ingredients">;
type ProductOption = Pick<
  Tables<"products">,
  "id" | "name" | "category" | "unit" | "content_per_unit" | "content_unit"
> & { archived: boolean };

type EditableIngredient = {
  localId: string;
  product_id: string;
  qty: number;
  position: number;
};

function uid() {
  return `new-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function CocktailEditor({
  cocktail,
  initialIngredients,
  productOptions,
}: {
  cocktail: Cocktail;
  initialIngredients: Ingredient[];
  productOptions: ProductOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  // ─── Header state ──────────────────────────────
  const [name, setName] = useState(cocktail.name ?? "");
  const [category, setCategory] = useState(cocktail.category ?? "");
  const [description, setDescription] = useState(cocktail.description ?? "");

  // ─── Ingredients ───────────────────────────────
  const [items, setItems] = useState<EditableIngredient[]>(() =>
    initialIngredients.map((i) => ({
      localId: i.product_id,
      product_id: i.product_id,
      qty: Number(i.qty ?? 0),
      position: i.position ?? 0,
    })),
  );

  const productsById = new Map(productOptions.map((p) => [p.id, p]));

  // ─── Dirty tracking ────────────────────────────
  const [baseline, setBaseline] = useState("");
  useEffect(() => {
    setBaseline(serialize());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function serialize(): string {
    return JSON.stringify({
      name: name.trim(),
      category: category.trim() || null,
      description: description.trim() || null,
      items: items
        .filter((i) => i.product_id)
        .map((i, idx) => ({
          product_id: i.product_id,
          qty: i.qty,
          position: idx,
        })),
    });
  }
  const dirty = baseline !== "" && serialize() !== baseline;

  function save() {
    if (!name.trim()) {
      setMsg({ kind: "err", text: "Nom requis." });
      return;
    }
    // Validate: no duplicate products, no missing qty
    const productIds = new Set<string>();
    for (const i of items) {
      if (!i.product_id) {
        setMsg({ kind: "err", text: "Une ligne est sans produit." });
        return;
      }
      if (productIds.has(i.product_id)) {
        setMsg({ kind: "err", text: "Le même produit apparaît deux fois." });
        return;
      }
      productIds.add(i.product_id);
      if (!Number.isFinite(i.qty) || i.qty < 0) {
        setMsg({ kind: "err", text: "Quantité invalide sur une ligne." });
        return;
      }
    }

    startTransition(async () => {
      setMsg(null);
      const headerRes = await saveCocktail(cocktail.id, {
        name,
        category,
        description,
      });
      if (!headerRes.ok) {
        setMsg({ kind: "err", text: headerRes.error });
        return;
      }
      const payload: IngredientInput[] = items
        .filter((i) => i.product_id)
        .map((i, idx) => ({
          product_id: i.product_id,
          qty: i.qty,
          position: idx,
        }));
      const ingRes = await saveCocktailIngredients(cocktail.id, payload);
      if (!ingRes.ok) {
        setMsg({ kind: "err", text: ingRes.error });
        return;
      }
      setBaseline(serialize());
      setMsg({ kind: "ok", text: "Recette enregistrée." });
      setTimeout(() => setMsg(null), 2500);
      router.refresh();
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const res = await toggleCocktailArchived(cocktail.id, !cocktail.archived);
      if (!res.ok) setMsg({ kind: "err", text: res.error });
      else router.refresh();
    });
  }

  function doDelete() {
    if (!window.confirm("Supprimer définitivement cette recette ?")) return;
    startTransition(async () => {
      const res = await deleteCocktail(cocktail.id);
      if (!res.ok) {
        setMsg({ kind: "err", text: res.error });
        return;
      }
      router.replace("/dashboard/cocktails");
    });
  }

  // ─── Ingredient ops ────────────────────────────
  function addIngredient() {
    setItems((prev) => [
      ...prev,
      {
        localId: uid(),
        product_id: "",
        qty: 0,
        position: prev.length,
      },
    ]);
  }
  function patchIngredient(localId: string, patch: Partial<EditableIngredient>) {
    setItems((prev) =>
      prev.map((i) => (i.localId === localId ? { ...i, ...patch } : i)),
    );
  }
  function removeIngredient(localId: string) {
    setItems((prev) => prev.filter((i) => i.localId !== localId));
  }

  // Group product options by category for nicer dropdowns
  const grouped = new Map<string, ProductOption[]>();
  for (const p of productOptions) {
    const arr = grouped.get(p.category) ?? [];
    arr.push(p);
    grouped.set(p.category, arr);
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-900 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">
            Recette {cocktail.archived && "· Archivée"}
          </p>
          <h1 className="font-display text-2xl text-slate-900 dark:text-white md:text-3xl">
            {cocktail.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 transition-colors hover:border-slate-300 dark:hover:border-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
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
          <button
            type="button"
            onClick={toggleArchive}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
          >
            {cocktail.archived ? (
              <>
                <ArchiveRestore className="h-3 w-3" /> Désarchiver
              </>
            ) : (
              <>
                <Archive className="h-3 w-3" /> Archiver
              </>
            )}
          </button>
          <button
            type="button"
            onClick={doDelete}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-3 w-3" /> Supprimer
          </button>
        </div>
      </div>

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

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {/* Metadata */}
        <div className="space-y-4">
          <Card title="Infos recette">
            <LabeledInput label="Nom" value={name} onChange={setName} />
            <LabeledInput
              label="Catégorie"
              value={category}
              onChange={setCategory}
              placeholder="Signature, Classique, Mocktail…"
            />
            <label className="block">
              <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                Description
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Base, amertume, acidité, garniture…"
                className="w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
              />
            </label>
          </Card>
        </div>

        {/* Ingredients */}
        <Card title="Ingrédients">
          {productOptions.length === 0 && (
            <div className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900/60 p-3 text-xs text-slate-500 dark:text-slate-400">
              Aucun produit dans le stock.{" "}
              <Link
                href="/dashboard/stock"
                className="text-slate-700 dark:text-slate-200 underline decoration-dotted underline-offset-2 hover:text-slate-900 dark:hover:text-white"
              >
                Crée d&apos;abord tes bouteilles / sirops / garnitures →
              </Link>
            </div>
          )}

          {items.length === 0 && productOptions.length > 0 ? (
            <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-500">
              Aucun ingrédient.{" "}
              <button
                type="button"
                onClick={addIngredient}
                className="text-slate-600 dark:text-slate-300 underline"
              >
                Ajouter la première ligne
              </button>
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((i) => {
                const product = productsById.get(i.product_id);
                const contentUnit = product?.content_unit ?? product?.unit ?? "";
                return (
                  <div
                    key={i.localId}
                    className="grid grid-cols-[auto_minmax(0,1fr)_80px_60px_auto] items-center gap-2"
                  >
                    <GripVertical className="h-3.5 w-3.5 text-slate-700" />
                    <select
                      value={i.product_id}
                      onChange={(e) =>
                        patchIngredient(i.localId, { product_id: e.target.value })
                      }
                      className="rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2.5 py-1.5 text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
                    >
                      <option value="">— Choisir un produit —</option>
                      {Array.from(grouped.entries()).map(([cat, list]) => (
                        <optgroup key={cat} label={cat}>
                          {list.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.content_per_unit && p.content_unit
                                ? ` (${p.content_per_unit}${p.content_unit}/${p.unit})`
                                : ` (${p.unit})`}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={i.qty}
                      onChange={(e) =>
                        patchIngredient(i.localId, {
                          qty: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full rounded-md border border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900 px-2 py-1.5 text-right text-sm text-slate-900 dark:text-white focus:border-[color:var(--color-grenat)] focus:outline-none"
                    />
                    <span className="text-[11px] text-slate-500 dark:text-slate-500">
                      {contentUnit}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeIngredient(i.localId)}
                      className="rounded p-1 text-slate-500 dark:text-slate-500 hover:text-red-300"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {productOptions.length > 0 && (
                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400 transition-colors hover:text-slate-900 dark:hover:text-white"
                >
                  <Plus className="h-3 w-3" /> Ajouter un ingrédient
                </button>
              )}
            </div>
          )}

          <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-600">
            Unité affichée = « contenu » du produit (ex: cl pour une bouteille).
            Renseigne « Contenu par unité » dans{" "}
            <Link
              href="/dashboard/stock"
              className="underline decoration-dotted underline-offset-2 hover:text-neutral-400"
            >
              /stock
            </Link>{" "}
            pour chaque produit, sinon le calcul stock utilisera l&apos;unité
            brute.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none p-4 md:p-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-none placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-[color:var(--color-grenat)] focus:outline-none"
      />
    </label>
  );
}
