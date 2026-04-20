# 🚀 Déployer sur GitHub + Vercel

## Étape 1 : Créer un repo GitHub

### 1.1 Va sur GitHub
- Ouvre [github.com](https://github.com)
- Clique "+ New repository"

### 1.2 Configure le repo
- **Repository name** : `cosmo-club`
- **Description** : `Bar à cocktails & barista événementiel - Paris`
- **Public** (recommandé) ou **Private** (sécurisé)
- **Ne crée PAS** de README/License (on en a déjà)
- Clique "Create repository"

## Étape 2 : Pousser le code

### 2.1 Depuis ton terminal
```bash
# Va dans le projet
cd /Users/benjaminamouyal/Desktop/Claude/cosmo-club

# Ajoute le repo GitHub
git remote add origin https://github.com/[TON_USERNAME]/cosmo-club.git

# Renomme la branche main si nécessaire
git branch -M main

# Pousse le code
git push -u origin main
```

**Note** : Remplace `[TON_USERNAME]` par ton pseudo GitHub

### 2.2 Vérification
- Va sur GitHub
- Tu devrais voir tout le code

## Étape 3 : Déployer sur Vercel

### 3.1 Va sur Vercel
- Ouvre [vercel.com](https://vercel.com)
- Crée un compte (ou connecte-toi)
- Clique "Add New..." → "Project"

### 3.2 Importe depuis GitHub
- Clique "Continue with GitHub"
- Autorise Vercel à accéder à tes repos
- Sélectionne `cosmo-club`

### 3.3 Configure le projet
Vercel détecte automatiquement :
- ✅ **Framework Preset** : Next.js
- ✅ **Build Command** : `npm run build`
- ✅ **Output Directory** : `.next`
- ✅ **Install Command** : `npm install`

Clique "Deploy"

## Étape 4 : Ajouter les variables d'environnement

### 4.1 Après le deploy (ou dans Settings)
- Va dans ton projet Vercel
- Clique "Settings"
- Va à "Environment Variables"

### 4.2 Ajoute les variables
```
NEXT_PUBLIC_ADMIN_PASSWORD = ton_mot_de_passe_secret
ADMIN_PASSWORD = ton_mot_de_passe_secret
```

**Important** : Choisis un mot de passe FORT

### 4.3 Redéploie
- Clique sur "Deployments" 
- Clique "Redeploy" sur le dernier déploiement
- Ou fait un `git push` vers main pour redéployer automatiquement

## 🎉 C'est bon !

### Ton site est live !
- **URL** : `https://cosmo-club.vercel.app`
- **Admin** : `https://cosmo-club.vercel.app/admin`
- **Mot de passe** : Celui que tu as défini

### À chaque modification
```bash
git add .
git commit -m "Description du changement"
git push
```

Vercel redéploiera **automatiquement** ✨

## 📋 Checklist finale

- [ ] Repo GitHub créé
- [ ] Code poussé sur GitHub
- [ ] Projet importé dans Vercel
- [ ] Variables d'env ajoutées
- [ ] Site visible sur `https://cosmo-club.vercel.app`
- [ ] Admin accessible sur `/admin`
- [ ] Mot de passe fonctionne

## 🆘 Troubleshooting

### "Build failed"
- Vérifie que tous les fichiers sont pushés
- Check les logs Vercel (onglet Deployments)

### "Cannot find module"
- Redéploie
- Ou fais `git push` pour forcer un nouveau build

### Admin ne fonctionne pas
- Vérifie les variables d'env dans Vercel Settings
- Redéploie après les avoir ajoutées

---

**Besoin d'aide ?** Consulte [README.md](README.md) ou [ADMIN-SETUP.md](ADMIN-SETUP.md)
