# Guide d'utilisation — Briefing staff

> Document interne pour Cosmo Club Paris.
> Public : opérateurs qui préparent les événements (Michael, Yvanna, équipe back-office).

---

## C'est quoi ?

Un **briefing staff** est un document opérationnel attaché à un événement.
Il contient tout ce que le staff doit savoir le jour J :

- Le planning précis (horaires, étapes, intervenants)
- Les stocks à prendre depuis l'atelier
- Les recettes des cocktails avec les mesures exactes
- Le dress code
- Les contacts livreurs externes (Acaris, Mondial Glaçons…)
- Les warnings et notes particulières
- Les documents annexes (menu, plans, etc.)
- Le guide de montage standard

**Le briefing remplace les anciens PDF "Cosmo x Client" préparés à la main.**

> ⚠️ Le briefing est **interne**. Il n'est jamais envoyé au client. Il est partagé uniquement avec le staff via un lien sécurisé.

---

## Quand le préparer ?

| Étape du projet | Action |
|---|---|
| Demande reçue | Rien à faire |
| Devis envoyé | Rien à faire |
| Devis signé → événement créé | Tu peux commencer à préparer le briefing |
| 1 à 3 jours avant l'événement | Briefing finalisé + lien partagé sur WhatsApp |
| Jour J | Le staff a tout sur son tel |

**Règle simple** : tu commences à le remplir dès que tu connais les détails (mixologues assignés, heure d'arrivée, n° de commande Acaris…). Tu n'as pas besoin d'attendre d'avoir tout — tu sauvegardes, tu reviens dessus, tu complètes au fil de l'eau.

---

## Workflow complet en 5 étapes

### 1️⃣ Préparer le briefing (1 clic)

1. Va dans **Dashboard → Événements**
2. Ouvre l'événement concerné
3. En haut à droite, clique sur **"Briefing staff"**
4. Tu arrives sur une page vide avec un bouton **"Préparer le briefing"** — clique dessus

➡️ En 1 seconde :
- Les 10 étapes du planning sont **pré-remplies** (de la livraison verrerie à la reprise)
- Le **dress code** est mis sur "Chemise noire, pantalon noir, chaussures noires"
- Un **lien unique** est généré pour partager avec le staff
- Les **recettes** des cocktails apparaissent automatiquement (depuis ce que tu as renseigné dans Cocktails de l'événement)
- Les **intervenants** suggérés sont ceux assignés à l'événement (depuis Équipe)

### 2️⃣ Remplir les blocs spécifiques

Tu vois plusieurs cartes à éditer. Tu peux les remplir dans n'importe quel ordre, sauvegarder partiellement, revenir plus tard.

**Planning de la prestation** (les 10 étapes)
- Mets les **horaires** dans la case "time"
- Ajuste les **désignations** si besoin
- Tape les **intervenants** séparés par virgule (`Wassim, Atef`) — la suggestion auto vient de l'équipe assignée
- Complète les **commentaires** avec les détails du jour : numéro Acaris, adresse précise, contact livreur, où déposer l'alcool, etc.
- Tu peux **glisser les étapes** pour les réordonner avec la souris (handle ⠿ à gauche)
- Tu peux **ajouter ou supprimer** des étapes (`+ Ajouter une étape`)

**Stocks à prendre**
- Texte libre. Copie-colle ton format habituel :
  ```
  ALCOOLS : RAS (event 100% sans alcool)
  SIROPS & PURÉES : 2× sirop vanille Monin, 1L purée framboise…
  JUS : 4L passion, 1L citron vert…
  ```
- Sera affiché tel quel sur le briefing imprimé (les retours à la ligne sont conservés)

**Contacts livreurs externes**
- Clique **"+ Ajouter un contact"** pour chaque livreur (Mondial Glaçons, Acaris, traiteur…)
- Renseigne : Rôle / Nom / Téléphone / N° commande
- Apparaîtra en tableau sur le briefing

**Dress code**
- Une ligne (le défaut "noir total" est déjà pré-rempli, modifie si besoin)

**Notes & warnings**
- Tout ce qui est particulier au jour J :
  - "Stock tampon dans casiers — ne déclencher qu'avec accord Michael/Yvanna"
  - "Possibilité que l'événement soit prolongé, prévenir Wassim"
  - "Accès parking côté livraison uniquement entre 10h et 12h"
- Sera mis en évidence avec un bandeau **orange ⚠️**

**Documents annexes**
- Clique **"+ Ajouter un lien"** pour chaque doc
- Colle l'URL d'un menu sur Drive, d'un plan d'implantation sur Notion, d'un PDF sur Storage, etc.
- Le **Guide de montage standard** (Portabar 2 Bay, réception Acaris, fin de service) est **toujours inclus automatiquement** en bas du briefing — pas besoin de l'ajouter manuellement

### 3️⃣ Sauvegarder

- Le bouton **"Enregistrer"** en haut à droite n'est actif que quand tu as modifié quelque chose
- Tu peux revenir sur la page autant de fois que tu veux — tout est persisté en DB

### 4️⃣ Partager le lien WhatsApp

En haut de la page d'édition, tu vois un encadré avec le lien à partager :

```
https://www.cosmoclub.fr/briefing/<id>?t=<token>
```

- **Copier** → met le lien dans le presse-papier → tu le colles dans le groupe WhatsApp du staff
- **Ouvrir** → ouvre le briefing dans un nouvel onglet pour vérifier ce que le staff voit
- **Régénérer** → invalide l'ancien lien et en crée un nouveau (utile si un staff quitte l'équipe et que tu veux qu'il n'ait plus accès)

> 🔒 Le lien est sécurisé par un token unique. Sans le token, l'URL ne marche pas (404). Personne ne peut deviner les briefings d'autres événements.

### 5️⃣ Le staff utilise le lien le jour J

Le staff ouvre le lien sur son téléphone. Il voit :

1. Le **header** avec titre événement, date, lieu, client, nombre d'invités
2. Le **tableau planning** complet (style du PDF que tu utilises actuellement)
3. Tous les autres blocs (stocks, recettes, dress code, contacts, warnings, annexes)
4. Le **guide de montage standard** en bas

Bouton **"Imprimer / Enregistrer en PDF"** disponible en haut → si un mixologue veut un PDF papier, il peut le générer en 1 clic depuis son tel.

---

## Tips & pièges à éviter

**✅ À faire**
- Prépare le briefing **dès que l'event est dans la pipe** — même incomplet. Tu reviens dessus à mesure que tu connais les détails.
- Renseigne les **assignations staff sur la fiche événement** AVANT de préparer le briefing → comme ça les suggestions d'intervenants sont déjà bonnes.
- Renseigne les **cocktails sur la fiche événement** AVANT → les recettes apparaissent automatiquement avec les bonnes mesures.
- **Régénère le lien** si tu suspectes une fuite (staff qui a quitté l'équipe, partage hors groupe…)

**❌ À éviter**
- Ne mets **jamais d'infos client** dans les warnings ou commentaires — ils sont internes mais autant éviter les ambiguïtés.
- N'envoie **jamais ce lien au client** — il contient les prix d'achat, le stock tampon, les warnings internes.
- Ne supprime pas une étape pré-remplie si tu n'es pas sûr : laisse-la avec un horaire vide, c'est plus safe que de la perdre.
- Le **PDF généré reste en français** — pour les events avec staff non-francophone, ajoute une note ou prévois une traduction manuelle (le briefing n'a pas de version anglaise auto pour l'instant).

---

## Questions fréquentes

**Le briefing est lié au devis ou à l'événement ?**
À l'**événement**. Un même client peut avoir plusieurs événements → chaque event a son propre briefing. Si tu dupliques un devis, le nouveau devis n'aura pas de briefing — tu en crées un quand l'event est créé.

**Et si je veux modifier le briefing après l'avoir partagé ?**
Tu modifies + tu sauvegardes. Le lien WhatsApp pointe sur la version live → le staff verra automatiquement les dernières modifs à chaque ouverture. Pas besoin de re-partager.

**Le staff doit-il avoir un compte sur le dashboard ?**
**Non**. Le lien fonctionne sans login. C'est public à condition d'avoir le bon token (UUID unique).

**Combien de temps le lien reste valide ?**
Indéfiniment, jusqu'à ce que tu cliques **"Régénérer"**. Pas d'expiration auto.

**Si je modifie une recette dans Cocktails, ça se met à jour dans le briefing ?**
**Oui, automatiquement**. Les recettes sont lues en live depuis la table cocktails. Si tu ajoutes un ingrédient, modifies une quantité, etc., le briefing reflète immédiatement.

**Et si je veux retirer un cocktail du briefing ?**
Tu le retires de la **fiche événement → section Cocktails**. Il disparaît du briefing aussi.

**Le guide de montage en bas, je peux le modifier ?**
Pas depuis l'interface (volontairement, pour qu'il reste cohérent entre tous les events). Pour le mettre à jour, il faut éditer le code (constant `BRIEFING_MONTAGE_GUIDE` dans `lib/server/briefingPreset.ts`).

**Puis-je dupliquer un briefing d'un autre event ?**
Pas pour l'instant. Si c'est fréquent on peut l'ajouter — dis-moi.

---

## Résumé rapide à coller dans WhatsApp

> Salut l'équipe, voici le briefing pour [NOM EVENT] le [DATE] :
> 👉 [LIEN]
>
> Tout est dessus : horaires, stocks, recettes, dress code, contacts livreurs.
> Pensez à le consulter avant de partir le jour J.
> Questions / ajustements → message direct.
