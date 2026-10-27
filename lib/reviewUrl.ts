/**
 * Lien « laisser un avis » de la fiche Google, saisi dans Paramètres et
 * envoyé aux clients. On n'accepte que des liens Google en https : le
 * lien part tel quel dans un e-mail client, un domaine arbitraire ferait
 * du dashboard un relais de phishing. Pur, sans I/O.
 */
const GOOGLE_REVIEW_HOSTS = new Set([
  "g.page",
  "g.co",
  "maps.app.goo.gl",
  "search.google.com",
  "google.com",
  "www.google.com",
  "www.google.fr",
  "maps.google.com",
]);

export function normalizeGoogleReviewUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value || value.length > 500) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!GOOGLE_REVIEW_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}
