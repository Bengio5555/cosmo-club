/**
 * Stock quantities are tracked in halves.
 *
 * A half-empty bottle is a real, countable thing here: one comes back
 * opened from an event and goes straight back on the shelf. Finer
 * fractions (0,6 / 0,8) are noise nobody counts, so every quantity that
 * enters or leaves stock is constrained to a multiple of 0,5.
 *
 * The `step` attribute alone isn't enough: it only validates on form
 * submit, and several stock fields commit on blur or from React state.
 * So the rule is re-checked server-side in the stock actions.
 */
export const STOCK_STEP = 0.5;

/** True when `n` is a finite multiple of 0,5. */
export function isHalfStep(n: number): boolean {
  return Number.isFinite(n) && Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

/** Snap `n` to the nearest multiple of 0,5. */
export function roundToHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

export const HALF_STEP_ERROR =
  "Quantité invalide : unités ou demies uniquement (ex. 1 ou 3,5).";
