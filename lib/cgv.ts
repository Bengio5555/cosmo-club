import { createHash } from "crypto";

/**
 * Source-of-truth text of the CGV. Living here (and not in the DB) lets
 * us version it via git: every commit that mutates this string changes
 * its hash, which is what we store on each signed quote so we can prove
 * later which exact version a given client accepted.
 *
 * Keep paragraphs separated by a single blank line — the renderer turns
 * each blank-line break into a new <p>.
 */
export const CGV_TEXT = `# Conditions générales de vente — Cosmo Club

## Prestations
Le Prestataire s'engage à fournir les services suivants, tels que convenus dans le devis avec le Client : mise à disposition du bar, personnel qualifié, approvisionnement en boissons, mise en place et démontage du matériel.

Un testing (dégustation préalable) peut être proposé pour les événements de grande ampleur ou à la demande du client. Il est offert sous réserve de validation du devis. En cas de non-confirmation de la prestation à l'issue de ce testing, celui-ci sera facturé au tarif de 100 € HT.

## Devis
Toute commande de prestation devra faire l'objet d'un devis établi par le Prestataire. Le Client s'engage à vérifier attentivement les éléments du devis et à le valider par écrit.

Le devis doit être retourné avec la mention « bon pour accord », daté et signé, par mail. Il inclut une fin de prestation à 2h du matin, sauf ajout d'heure supplémentaire.

Les repas du personnel (repas staff) ne sont pas inclus dans le devis de base, sauf indication contraire. Ils restent à la charge du client, notamment lorsque les horaires de présence imposent des repas sur place, avec prise en compte des éventuelles restrictions alimentaires.

## Tarifs et paiement
Sauf stipulation contraire, le paiement s'effectuera selon les modalités suivantes :

- Un acompte de 50 % du montant total à la signature du contrat.
- Le solde devra être réglé avant la date de l'événement.

Toute modification apportée au dossier doit être confirmée par écrit, afin d'être prise en compte.

## Logistique & accès
En cas de lieux complexes d'accès (ex. aéroports comme Le Bourget, salons d'expositions, sites avec accès restreint, etc.), les frais de stationnement ou parkings pour les véhicules du staff sont à la charge du Client.

En l'absence d'ascenseur ou d'accès facilité, des frais de manutention supplémentaires peuvent être appliqués pour couvrir les efforts logistiques.

## Impression de menus
L'impression des menus est offerte, à condition que :

- Le design et format correspondent aux gabarits standards définis par le Prestataire.
- Aucune carte à finition particulière ou support coûteux (dorure, papier spécial, etc.) ne soit demandée.

Dans le cas contraire, un surcoût pourra être appliqué.

## Choix des recettes
Le choix des recettes (cocktails ou boissons) doit être définitivement validé 15 jours avant l'événement. Passé ce délai, le Prestataire se réserve le droit de :

- Proposer des recettes de remplacement compatibles avec les contraintes d'approvisionnement,
- ou choisir les recettes de manière autonome, en tenant compte des disponibilités logistiques.

## Verrerie
La verrerie mise à disposition est incluse dans la prestation.

Toute casse ou perte sera facturée après l'événement. Le tarif pourra varier en fonction de la quantité, des modèles et des contraintes de livraison ou reprise imposées par le lieu.

## Responsabilités et assurance
La consommation excessive de boissons alcoolisées par les participants est du ressort de l'organisateur de l'événement. En aucun cas Cosmo Club ne pourra être jugé responsable des débordements et casses entraînés par une consommation excessive.

Les boissons, préparations maison, cocktails de jus de fruits frais, vins & alcools prévus pour l'occasion et non consommés ne seront pas défalqués de la facturation finale.

## Annulation
En cas d'annulation de la prestation par le Client à moins de 20 jours calendaires de l'événement, sans motif légitime ou cas de force majeure dûment justifié, l'acompte versé restera acquis au Prestataire et ne pourra faire l'objet d'un remboursement.

## Gestion des déchets
La gestion des déchets n'est pas prise en charge par Cosmo Club, sauf si cela est expressément stipulé dans le devis.

Lorsque cette prestation est incluse, elle fait l'objet d'une facturation minimale de 150 € HT.

- **Tri et recyclage** — dans la mesure du possible, le tri des déchets sera effectué et le recyclage privilégié.
- **Frais associés** — ces frais sont distinctement mentionnés dans le devis si la gestion des déchets est demandée.
- Le Client doit signaler toute exigence spécifique du lieu (normes environnementales, enlèvement obligatoire, prestataires imposés, etc.) avant la signature du devis. Des frais supplémentaires peuvent alors s'appliquer.

## Stock tampon
Cosmo Club ne prévoit de stock tampon qu'en cas d'accord préalable avec le Client.

Si cette option est retenue, un pourcentage de stock supplémentaire (exprimé en % du devis initial) est convenu au préalable et indiqué dans le devis.

Ce stock ne pourra être utilisé qu'avec l'accord explicite du Client pendant l'événement. En cas d'activation, une refacturation équivalente au pourcentage convenu sera appliquée après l'événement.`;

/**
 * Short SHA-256 prefix of the current CGV text. Stored on each accepted
 * quote so we can later prove which version of the terms was signed.
 * Truncated to 12 chars: collision-resistant enough for an audit log.
 */
export function cgvVersion(): string {
  return createHash("sha256")
    .update(CGV_TEXT, "utf8")
    .digest("hex")
    .slice(0, 12);
}

/** Tiny markdown subset → HTML for the public CGV page. Handles
 * `# h1`, `## h2`, `- bullets`, and **bold**. Anything fancier
 * belongs in the source string above. */
export function renderCgvHtml(src: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const inlineBold = (s: string) =>
    s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const blocks = src.split(/\n\n+/);
  const out: string[] = [];
  for (const raw of blocks) {
    const b = raw.trim();
    if (!b) continue;
    if (b.startsWith("# ")) {
      // Demoted to <h2>: every page that embeds the CGV (public /cgv,
      // the acceptance modal) already has its own <h1>, and the
      // doc-title was creating a duplicate-H1 on-page SEO issue.
      out.push(`<h2>${inlineBold(escape(b.slice(2)))}</h2>`);
    } else if (b.startsWith("## ")) {
      out.push(`<h2>${inlineBold(escape(b.slice(3)))}</h2>`);
    } else if (b.split("\n").every((l) => l.trim().startsWith("- "))) {
      const items = b
        .split("\n")
        .map((l) => `<li>${inlineBold(escape(l.trim().slice(2)))}</li>`)
        .join("");
      out.push(`<ul>${items}</ul>`);
    } else {
      out.push(`<p>${inlineBold(escape(b))}</p>`);
    }
  }
  return out.join("\n");
}
