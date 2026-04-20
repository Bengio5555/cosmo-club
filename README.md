# Cosmo Club Paris — Site Web

Bar à cocktails & barista événementiel à Paris. Site Next.js 15 premium avec système d'administration pour gérer les images.

## 🚀 Démarrage rapide

### Installation locale
```bash
npm install
npm run dev
```

Puis ouvre [http://localhost:3000](http://localhost:3000)

### Admin
**URL** : `http://localhost:3000/admin`  
**Mot de passe** : `admin2024` (à changer en production)

## 📁 Structure

```
/app
  /(site)           # Pages publiques
  /admin            # Interface d'administration
  /api/admin        # API pour gérer les images

/components         # Composants React
/public
  /brand/ai         # Images du site
  images-config.json # Configuration des images

/lib                # Utilitaires et contenu
```

## ⚙️ Configuration

### Variables d'environnement

Crée un fichier `.env.local` :
```env
NEXT_PUBLIC_ADMIN_PASSWORD=ton_mot_de_passe
ADMIN_PASSWORD=ton_mot_de_passe
```

## 🖼️ Gestion des images

### Configuration
Le fichier `/public/images-config.json` contient les métadonnées :
- **title** : Nom de l'image
- **path** : Chemin dans `/public`
- **orientation** : `portrait` / `landscape` / `square`
- **section** : Catégorie

### Ajouter une image
1. Dépose le fichier dans `/public/brand/ai/`
2. Ajoute une entrée dans `images-config.json`
3. Gère l'orientation depuis `/admin`

## 🛠️ Tech Stack

- **Framework** : Next.js 15
- **Styling** : Tailwind CSS
- **Animations** : Framer Motion
- **UI** : shadcn/ui
- **Fonts** : Geist, Geist Mono

## 📝 Pages

- `/` — Accueil
- `/bar-a-cocktails` — Bar à cocktails
- `/barista` — Barista & lattes
- `/concept` — Concept & manifeste
- `/evenements` — Événements & galerie
- `/contact` — Formulaire de contact
- `/admin` — Gestion des images

## 🔐 Admin

### Fonctionnalités
✅ Voir toutes les images par page  
✅ Modifier l'orientation  
✅ Prévisualiser en temps réel  
✅ Sauvegarder les changements  

### Authentification
- Simple mot de passe
- Variables d'env sur Vercel

## 🚀 Déployer sur Vercel

### 1. Créer un repo GitHub
```bash
git remote add origin https://github.com/[TON_USERNAME]/cosmo-club.git
git push -u origin main
```

### 2. Connecter Vercel
1. Va sur [vercel.com](https://vercel.com)
2. Clique "Add New..." → "Project"
3. Sélectionne ton repo GitHub
4. Vercel détecte automatiquement Next.js

### 3. Ajouter variables d'env
Dans Vercel → Project Settings → Environment Variables :
```
NEXT_PUBLIC_ADMIN_PASSWORD = ton_mot_de_passe
ADMIN_PASSWORD = ton_mot_de_passe
```

### 4. Déployer
- Clique "Deploy"
- Chaque push sur `main` redéploie automatiquement
- URL : `https://cosmo-club.vercel.app`

---

**Cosmo Club Paris** — Là où les cocktails deviennent des œuvres liquides.
