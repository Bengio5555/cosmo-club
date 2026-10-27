/**
 * Verdict du champ piège anti-robots du formulaire de devis (hp_f2).
 *
 * Un champ caché rempli ne suffit pas à conclure au robot : Chrome et Arc
 * remplissent aussi les champs invisibles qu'ils prennent pour un nom, une
 * adresse ou un téléphone, malgré autoComplete="off". Le 27/10/2026, une
 * vraie demande a ainsi été classée robot et n'a déclenché aucun e-mail.
 *
 * - "clean"    : champ vide.
 * - "autofill" : la valeur reprend un autre champ du formulaire, ou a la
 *                forme de ce qu'un navigateur remplit (téléphone, e-mail,
 *                adresse, code postal) → demande traitée normalement.
 * - "bot"      : autre chose (texte libre, lien…) → demande signalée.
 *
 * Pur, sans I/O : testé dans tests/seo-geo.test.mjs.
 */
export type HoneypotVerdict = "clean" | "autofill" | "bot";

type Fields = {
  hp_f2?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  message?: string | null;
  canBrand?: string | null;
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const digits = (s: string) => s.replace(/\D/g, "");

export function honeypotVerdict(d: Fields): HoneypotVerdict {
  const raw = (d.hp_f2 ?? "").trim();
  if (!raw) return "clean";
  const v = norm(raw);

  // Un lien est la signature classique d'un robot de spam.
  if (/https?:\/\/|www\./i.test(raw)) return "bot";

  const others = [d.firstName, d.lastName, d.email, d.phone, d.location, d.canBrand]
    .map((x) => norm(x ?? ""))
    .filter((x) => x.length >= 2);
  const fullName = norm(`${d.firstName ?? ""} ${d.lastName ?? ""}`);
  if (fullName.length >= 3) others.push(fullName, norm(`${d.lastName ?? ""} ${d.firstName ?? ""}`));

  if (others.some((o) => o === v || (v.length >= 3 && o.includes(v)) || (o.length >= 3 && v.includes(o)))) {
    return "autofill";
  }
  // Même téléphone écrit autrement (espaces, +33…).
  const phone = digits(d.phone ?? "");
  const vd = digits(raw);
  if (phone.length >= 6 && vd.length >= 6 && (phone.endsWith(vd.slice(-9)) || vd.endsWith(phone.slice(-9)))) {
    return "autofill";
  }
  // Formes que remplit un navigateur : e-mail, téléphone, adresse postale, code postal, ville.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return "autofill";
  if (/^[0-9+().\s-]{6,}$/.test(raw)) return "autofill";
  if (/\b\d{5}\b/.test(raw) || /\b(rue|avenue|av\.|bd|boulevard|place|chemin|allee|impasse|quai)\b/.test(v)) return "autofill";
  if (/^[a-z' -]{2,40}$/.test(v) && v.split(" ").length <= 3) return "autofill";

  return "bot";
}
