"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ListTodo, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  coerceEventTodo,
  todoProgress,
  type EventTodoData,
} from "@/lib/server/eventTodoTemplate";
import { saveEventTodo } from "../actions";

function uid(): string {
  return `c-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Floating "TO DO" flag on the right edge of the event page + a slide-in
 * drawer holding the validation checklist (sections → groups → items).
 * The operator ticks items and appends custom lines per group; the full
 * blob is persisted to events.todo_data after each change.
 *
 * The flag carries a traffic-light dot:
 *   red    → nothing done yet
 *   amber  → in progress
 *   green  → everything checked
 */
export function EventTodo({
  eventId,
  initialData,
}: {
  eventId: string;
  initialData: unknown;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EventTodoData>(() =>
    coerceEventTodo(initialData),
  );
  const [, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);

  const { done, total } = todoProgress(data);
  const pct = total > 0 ? done / total : 0;
  const status: "red" | "amber" | "green" =
    done === 0 ? "red" : done >= total ? "green" : "amber";

  // Persist the new blob. Optimistic: state is already updated by the
  // caller; we just push to the server and surface a tiny saving flag.
  function persist(next: EventTodoData) {
    setData(next);
    setSaving(true);
    startTransition(async () => {
      await saveEventTodo(eventId, next);
      setSaving(false);
    });
  }

  function toggleItem(sectionId: string, groupIdx: number, itemId: string) {
    persist({
      ...data,
      sections: data.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              groups: s.groups.map((g, gi) =>
                gi !== groupIdx
                  ? g
                  : {
                      ...g,
                      items: g.items.map((it) =>
                        it.id === itemId ? { ...it, done: !it.done } : it,
                      ),
                    },
              ),
            },
      ),
    });
  }

  function addItem(sectionId: string, groupIdx: number, label: string) {
    const clean = label.trim();
    if (!clean) return;
    persist({
      ...data,
      sections: data.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              groups: s.groups.map((g, gi) =>
                gi !== groupIdx
                  ? g
                  : { ...g, items: [...g.items, { id: uid(), label: clean, done: false }] },
              ),
            },
      ),
    });
  }

  function removeItem(sectionId: string, groupIdx: number, itemId: string) {
    persist({
      ...data,
      sections: data.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              groups: s.groups.map((g, gi) =>
                gi !== groupIdx
                  ? g
                  : { ...g, items: g.items.filter((it) => it.id !== itemId) },
              ),
            },
      ),
    });
  }

  const dotColor =
    status === "green"
      ? "bg-emerald-400"
      : status === "amber"
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <>
      {/* Right-edge flag — always visible, hidden only while the drawer
          is open (the drawer's own header carries the close button). */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir la to-do de l'événement"
          className="fixed right-0 top-1/3 z-40 flex items-center gap-2 rounded-l-lg border border-r-0 border-slate-300 bg-white px-2.5 py-3 shadow-lg transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <span className="relative flex h-2.5 w-2.5">
            {status === "amber" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            )}
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
          </span>
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 dark:text-slate-200"
            style={{ writingMode: "vertical-rl" }}
          >
            To-do
          </span>
        </button>
      )}

      {open && (
        <Drawer onClose={() => setOpen(false)}>
          <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                <ListTodo className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                Validation de l’événement
              </p>
              <p className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-500">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${dotColor}`}
                />
                {done}/{total} fait
                {saving && (
                  <span className="inline-flex items-center gap-1 text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" /> sauvegarde…
                  </span>
                )}
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1 w-40 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all ${
                    status === "green"
                      ? "bg-emerald-400"
                      : status === "amber"
                        ? "bg-amber-400"
                        : "bg-red-400"
                  }`}
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer"
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {data.sections.map((section) => (
              <section key={section.id}>
                <h3 className="mb-2 text-[12px] font-semibold text-slate-900 dark:text-white">
                  {section.title}
                </h3>
                <div className="space-y-3">
                  {section.groups.map((group, gi) => (
                    <div key={gi}>
                      {group.title && (
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
                          {group.title}
                        </p>
                      )}
                      <ul className="space-y-0.5">
                        {group.items.map((it) => (
                          <li
                            key={it.id}
                            className="group flex items-start gap-2 rounded-md px-1.5 py-1 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(section.id, gi, it.id)}
                              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                it.done
                                  ? "border-emerald-500 bg-emerald-500 text-white"
                                  : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900"
                              }`}
                              aria-label={it.done ? "Décocher" : "Cocher"}
                            >
                              {it.done && <Check className="h-3 w-3" />}
                            </button>
                            <span
                              className={`flex-1 text-[13px] leading-snug ${
                                it.done
                                  ? "text-slate-400 line-through dark:text-slate-600"
                                  : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {it.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(section.id, gi, it.id)}
                              aria-label="Supprimer la ligne"
                              className="mt-0.5 text-slate-300 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 dark:text-slate-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      <AddLine
                        onAdd={(label) => addItem(section.id, gi, label)}
                      />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Drawer>
      )}
    </>
  );
}

/** Inline "+ Ajouter une ligne" → reveals an input on click. */
function AddLine({ onAdd }: { onAdd: (label: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    if (val.trim()) onAdd(val);
    setVal("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-1 inline-flex items-center gap-1 px-1.5 text-[11px] text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <Plus className="h-3 w-3" /> Ajouter une ligne
      </button>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1.5 px-1.5">
      <input
        ref={ref}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setVal("");
            setEditing(false);
          }
        }}
        onBlur={commit}
        placeholder="Nouvelle tâche…"
        className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-[13px] text-slate-900 focus:border-[color:var(--color-grenat)] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

/* Right-side drawer shell — mirrors the catalogue picker's conventions
   (click-outside + Escape close, body scroll lock). The mount effect
   runs once; onClose is read through a ref so it never re-runs and
   steals focus. */
function Drawer({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-slate-950 md:border-l md:border-slate-800">
        {children}
      </div>
    </div>
  );
}
