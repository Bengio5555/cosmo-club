/**
 * « À faire cette semaine » de /dashboard/visibilite.
 *
 * Les règles décident, pas un modèle : chaque action a un déclencheur
 * chiffré tiré des passages (geo_runs / geo_results) ou des demandes
 * d'avis en attente. Trois actions au plus, rangées par impact. Les
 * décisions (faite, plus tard) vivent dans geo_actions ; une action faite
 * garde sa base de comparaison pour la mesure à J+28.
 *
 * Pur, sans I/O : testé dans tests/seo-geo.test.mjs.
 */
import type { GeoCategory } from "./questions";

export type RunLite = { id: string; ran_at: string; questions: number; cited: number };
export type ResultLite = {
  run_id: string;
  question: string;
  category: string;
  cited: boolean;
  cited_domains: string[];
  cited_sources: unknown;
  error: string | null;
};
export type Decision = {
  key: string;
  status: "done" | "snoozed";
  snoozed_until: string | null;
  done_at: string | null;
  baseline: unknown;
  title: string;
  kind: string;
};

export type ActionKind = "reviews" | "directory" | "profile" | "article" | "competitor" | "content";
export type GeoAction = {
  key: string;
  kind: ActionKind;
  title: string;
  detail: string;
  /** Lien du bouton principal (page publique, site cité, page Avis clients). */
  href: string | null;
  hrefLabel: string | null;
  /** Article à qui écrire : le bouton « Préparer l'e-mail » apparaît. */
  article: { url: string; title: string } | null;
  /** Questions concernées : servent de base à la mesure si l'action est faite. */
  questions: string[];
  score: number;
};

/** Annuaires et places de marché où une fiche suffit à apparaître. */
export const DIRECTORIES = [
  "mariages.net",
  "zankyou.fr",
  "abcsalles.com",
  "1001salles.com",
  "kactus.com",
  "pagesjaunes.fr",
  "starofservice.com",
  "yelp.fr",
  "tripadvisor.fr",
  "eventbrite.fr",
];

/** Page publique et fait à ajouter quand une catégorie n'est jamais citée. */
export const CONTENT_GAPS: Record<GeoCategory, { label: string; path: string; fact: string; score: number }> = {
  prix: { label: "Prix", path: "/bar-a-cocktails/mariage", fact: "une fourchette de prix pour 50, 100 et 150 invités", score: 45 },
  mariage: { label: "Mariage", path: "/bar-a-cocktails/mariage", fact: "le nombre de mariages réalisés et deux ou trois lieux où l'équipe est intervenue", score: 40 },
  entreprise: { label: "Entreprise", path: "/bar-a-cocktails/entreprise", fact: "quelques marques clientes et les formats (nombre d'invités, durée)", score: 38 },
  atelier: { label: "Atelier mixologie", path: "/animation-cocktail-paris", fact: "le prix par personne et le nombre de participants possible", score: 35 },
  prive: { label: "Soirée privée", path: "/barman-prive-paris", fact: "le tarif de départ d'une soirée avec barman à domicile", score: 34 },
  anniversaire: { label: "Anniversaire", path: "/bar-a-cocktails/anniversaire", fact: "un exemple de formule avec nombre d'invités et budget", score: 30 },
  barista: { label: "Barista", path: "/barista", fact: "les formats (nombre de tasses, durée) et un tarif de départ", score: 30 },
  canettes: { label: "Canettes", path: "/canettes-personnalisees", fact: "le délai de fabrication et la quantité minimale", score: 28 },
};

const SNOOZE_DAYS = 14;
const MIN_ANSWERS = 3;
/** Au-delà de 10 réponses, un site de plus ne change plus la priorité : les autres actions gardent leur place. */
const weight = (n: number) => Math.min(n, 10);
const MEASURE_AFTER_DAYS = 28;

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

export function isDirectory(domain: string): boolean {
  return DIRECTORIES.some((d) => domain === d || domain.endsWith("." + d));
}

/** Une page d'article ou de classement (on peut écrire à son auteur), pas une page d'accueil ou de service. */
export function isArticleUrl(url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return false;
  }
  if (/\/(blog|article|articles|actu|actualites?|magazine|mag|conseils?|guide|guides|inspiration|idees?)\//.test(path)) return true;
  if (/(top-?\d+|meilleur|classement|selection|liste-des)/.test(path)) return true;
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  return slug.split("-").length >= 5;
}

function asSources(v: unknown): { url: string; title: string }[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (s): s is { url: string; title: string } =>
      !!s && typeof s === "object" && typeof (s as { url?: unknown }).url === "string",
  );
}

const pct = (n: number) => `${n} réponse${n > 1 ? "s" : ""}`;

/**
 * Actions candidates, sans tenir compte des décisions. `runs` du plus
 * récent au plus ancien ; seuls les 4 derniers passages comptent.
 */
export function candidateActions(input: {
  runs: RunLite[];
  results: ResultLite[];
  pendingReviews: { count: number; latestEventId: string | null };
  /** Annuaires où Cosmo Club a déjà une fiche : on propose de l'étoffer, pas de s'inscrire. */
  presence?: { domain: string; url: string }[];
}): GeoAction[] {
  const out: GeoAction[] = [];
  const recentIds = new Set(input.runs.slice(0, 4).map((r) => r.id));
  const recent = input.results.filter((r) => recentIds.has(r.run_id) && !r.error);

  if (input.pendingReviews.count > 0 && input.pendingReviews.latestEventId) {
    const n = input.pendingReviews.count;
    out.push({
      key: `reviews:${input.pendingReviews.latestEventId}`,
      kind: "reviews",
      title: `Envoie ${n > 1 ? `les ${n} demandes` : "la demande"} d'avis en attente`,
      detail: "Les avis Google pèsent dans les recommandations de Google et des assistants IA. Un clic par événement.",
      href: "/dashboard/avis",
      hrefLabel: "Ouvrir Avis clients",
      article: null,
      questions: [],
      score: 50 + Math.min(n, 5) * 2,
    });
  }

  // Sites cités à notre place : réponses où ils apparaissent sans nous, et leur page la plus citée.
  const byDomain = new Map<string, { count: number; questions: Set<string>; urls: Map<string, { title: string; n: number }> }>();
  for (const r of recent) {
    if (r.cited) continue;
    const sources = asSources(r.cited_sources);
    for (const d of new Set(r.cited_domains)) {
      const e = byDomain.get(d) ?? { count: 0, questions: new Set<string>(), urls: new Map() };
      e.count += 1;
      e.questions.add(r.question);
      for (const s of sources) {
        if (hostOf(s.url) !== d) continue;
        const u = e.urls.get(s.url) ?? { title: s.title, n: 0 };
        u.n += 1;
        e.urls.set(s.url, u);
      }
      byDomain.set(d, e);
    }
  }
  for (const [domain, e] of byDomain) {
    if (e.count < MIN_ANSWERS) continue;
    const top = [...e.urls.entries()].sort((a, b) => b[1].n - a[1].n)[0];
    const questions = [...e.questions];
    const seen = `Cité dans ${pct(e.count)} ces dernières semaines, sans Cosmo Club.`;
    const profile = input.presence?.find((p) => p.domain === domain);
    if (profile) {
      out.push({
        key: `profile:${domain}`,
        kind: "profile",
        title: `Étoffe la fiche Cosmo Club sur ${domain}`,
        detail: `${seen} La fiche existe, mais d'autres prestataires ressortent : des avis de clients, des photos récentes et un prix clair l'aident à être reprise.`,
        href: profile.url,
        hrefLabel: "Ouvrir la fiche",
        article: null,
        questions,
        score: 42 + weight(e.count),
      });
    } else if (isDirectory(domain)) {
      out.push({
        key: `site:${domain}`,
        kind: "directory",
        title: `Inscris Cosmo Club sur ${domain}`,
        detail: `${seen} Les assistants s'en servent pour recommander des prestataires : une fiche complète (photos, prix, avis) suffit pour y figurer.`,
        href: `https://${domain}`,
        hrefLabel: `Ouvrir ${domain}`,
        article: null,
        questions,
        score: 40 + weight(e.count),
      });
    } else if (top && isArticleUrl(top[0])) {
      out.push({
        key: `site:${domain}`,
        kind: "article",
        title: `Propose Cosmo Club pour l'article de ${domain}`,
        detail: `${seen} C'est une liste ou un guide : écrire à son auteur peut suffire pour y être ajouté.`,
        href: top[0],
        hrefLabel: "Lire l'article",
        article: { url: top[0], title: top[1].title || domain },
        questions,
        score: 35 + weight(e.count),
      });
    } else {
      out.push({
        key: `site:${domain}`,
        kind: "competitor",
        title: `Regarde ce que ${domain} affiche et pas nous`,
        detail: `${seen} Compare sa page à la nôtre : prix affichés, photos, questions fréquentes, avis.`,
        href: top ? top[0] : `https://${domain}`,
        hrefLabel: `Ouvrir ${domain}`,
        article: null,
        questions,
        score: 20 + weight(e.count),
      });
    }
  }

  // Catégories jamais citées sur les 2 derniers passages (ou le seul passage disponible).
  const lastTwo = new Set(input.runs.slice(0, 2).map((r) => r.id));
  const byCat = new Map<string, { cited: number; total: number; questions: Set<string> }>();
  for (const r of recent) {
    if (!lastTwo.has(r.run_id)) continue;
    const c = byCat.get(r.category) ?? { cited: 0, total: 0, questions: new Set<string>() };
    c.total += 1;
    if (r.cited) c.cited += 1;
    c.questions.add(r.question);
    byCat.set(r.category, c);
  }
  for (const [cat, c] of byCat) {
    const gap = CONTENT_GAPS[cat as GeoCategory];
    if (!gap || c.cited > 0 || c.total < 2) continue;
    out.push({
      key: `content:${cat}`,
      kind: "content",
      title: `Ajoute ${gap.fact} sur la page ${gap.path}`,
      detail: `Catégorie « ${gap.label} » : cité dans 0 réponse sur ${c.total}. Les assistants reprennent les faits précis et chiffrés ; il en manque un sur ce sujet.`,
      href: gap.path,
      hrefLabel: "Ouvrir la page",
      article: null,
      questions: [...c.questions],
      score: gap.score,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Les actions à afficher : sans celles faites, ni celles remises à plus tard et pas encore échues. */
export function pickActions(candidates: GeoAction[], decisions: Decision[], today: string, max = 3): GeoAction[] {
  const byKey = new Map(decisions.map((d) => [d.key, d]));
  return candidates
    .filter((a) => {
      const d = byKey.get(a.key);
      if (!d) return true;
      if (d.status === "done") return false;
      return !!d.snoozed_until && d.snoozed_until <= today;
    })
    .slice(0, max);
}

export function snoozeUntil(today: Date): string {
  return new Date(today.getTime() + SNOOZE_DAYS * 86400000).toISOString().slice(0, 10);
}

/** Taux de citation sur un ensemble de questions, pour une liste de passages. */
export function citationRate(results: ResultLite[], runIds: Set<string>, questions: string[]) {
  const qs = new Set(questions);
  const rows = results.filter((r) => runIds.has(r.run_id) && !r.error && (qs.size === 0 || qs.has(r.question)));
  return { cited: rows.filter((r) => r.cited).length, total: rows.length };
}

export type Baseline = { questions: string[]; cited: number; total: number };

export function baselineFor(action: GeoAction, runs: RunLite[], results: ResultLite[]): Baseline {
  const ids = new Set(runs.slice(0, 4).map((r) => r.id));
  return { questions: action.questions, ...citationRate(results, ids, action.questions) };
}

export type Outcome =
  | { state: "waiting"; readyOn: string }
  | { state: "measured"; before: Baseline; after: { cited: number; total: number }; better: boolean };

/**
 * Mesure à J+28 d'une action faite : taux de citation sur ses questions,
 * avant (base enregistrée) et après (passages postérieurs d'au moins 7
 * jours, le temps que les sites et les index se mettent à jour).
 */
export function outcomeOf(decision: Decision, runs: RunLite[], results: ResultLite[], now: Date): Outcome | null {
  if (decision.status !== "done" || !decision.done_at) return null;
  const b = decision.baseline as Baseline | null;
  if (!b || !Array.isArray(b.questions) || b.questions.length === 0) return null;
  const doneAt = new Date(decision.done_at).getTime();
  const readyOn = new Date(doneAt + MEASURE_AFTER_DAYS * 86400000);
  const afterRuns = runs.filter((r) => new Date(r.ran_at).getTime() > doneAt + 7 * 86400000);
  if (now < readyOn || afterRuns.length < 2) return { state: "waiting", readyOn: readyOn.toISOString().slice(0, 10) };
  const after = citationRate(results, new Set(afterRuns.slice(0, 4).map((r) => r.id)), b.questions);
  const rateBefore = b.total ? b.cited / b.total : 0;
  const rateAfter = after.total ? after.cited / after.total : 0;
  return { state: "measured", before: b, after, better: rateAfter > rateBefore };
}
