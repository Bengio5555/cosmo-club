"use client";

import { Printer } from "lucide-react";

/**
 * Thin client wrapper around window.print(). Kept tiny so the rest of
 * the shopping list page stays fully server-rendered. The browser print
 * dialog also exposes "Save as PDF" — no PDF library needed.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      className="primary"
      onClick={() => window.print()}
    >
      <Printer className="h-3 w-3" />
      Imprimer / PDF
    </button>
  );
}
