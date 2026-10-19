"use client";

import { Printer } from "lucide-react";

export function PrintLabelsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
    >
      <Printer className="h-4 w-4" /> Imprimer
    </button>
  );
}
