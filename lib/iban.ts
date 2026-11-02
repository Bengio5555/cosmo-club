/**
 * IBAN / BIC : normalisation, contrôle et affichage. Pur, testé dans
 * tests/iban.test.mjs. Le contrôle mod 97 attrape les fautes de frappe
 * avant qu'un code de confirmation ne parte.
 */

export function normalizeIban(raw: string): string {
  return raw.replace(/[\s-]+/g, "").toUpperCase();
}

export function isValidIban(raw: string): boolean {
  const iban = normalizeIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("FR") && iban.length !== 27) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rest = 0;
  for (const ch of rearranged) {
    const n = ch >= "A" ? ch.charCodeAt(0) - 55 : Number(ch);
    rest = Number(String(rest) + String(n)) % 97;
  }
  return rest === 1;
}

export function normalizeBic(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function isValidBic(raw: string): boolean {
  return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalizeBic(raw));
}

/** FR76 3000 6000 0112 3456 7890 189 */
export function formatIban(iban: string): string {
  return normalizeIban(iban).replace(/(.{4})/g, "$1 ").trim();
}

/** FR76 •••• 0189 — même rendu que public.mask_iban() côté base. */
export function maskIban(iban: string | null | undefined): string {
  const v = normalizeIban(iban ?? "");
  if (v.length < 8) return v || "—";
  return `${v.slice(0, 4)} •••• ${v.slice(-4)}`;
}

/** a…@domaine.fr : pour dire où part le code sans afficher l'adresse entière. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user[0]}…@${domain}`;
}
