"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}>
      Imprimer / Enregistrer en PDF
    </button>
  );
}
