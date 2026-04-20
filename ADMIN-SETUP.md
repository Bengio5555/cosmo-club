# 🔐 Système d'Administration Cosmo Club

## ✅ Fichiers créés

### 1. **Configuration des images**
- **Chemin** : `/public/images-config.json`
- **Contenu** : Métadonnées de toutes les images du site (titre, chemin, orientation)
- **Format** : JSON organisé par page/section

```json
{
  "pages": {
    "home": {
      "hero": {
        "title": "Hero Home",
        "path": "/brand/ai/hero-home.png",
        "orientation": "landscape",
        "section": "Hero"
      }
    }
  }
}
```

### 2. **Page Admin**
- **Route** : `/admin`
- **Chemin** : `/app/admin/page.tsx`
- **Fonctionnalité** : Interface de gestion des images (en cours de développement)

## 🚀 Comment utiliser

### 1. Démarrer le serveur
```bash
npm run dev
```

### 2. Accéder à l'admin
- URL : `http://localhost:3000/admin`

### 3. Gérer les images
- Sélectionner une page dans la sidebar
- Modifier l'orientation (portrait/landscape/square)
- Remplacer les images en déposant les fichiers dans `/public/brand/ai/`

## 📋 Pages disponibles

- `home` - Page d'accueil
- `bar-a-cocktails` - Bar à cocktails
- `barista` - Barista
- `personnalisation` - Personnalisation (Glaçons, Pastilles)
- `products` - Produits (Bouteilles)
- `gallery` - Galerie
- `lattes` - Lattes (Matcha, Ube, Blue, Golden)

## 🔑 Authentification

Pour ajouter une authentification sécurisée à la page admin :

1. Crée un fichier `.env.local` :
```
NEXT_PUBLIC_ADMIN_PASSWORD=ton_mot_de_passe
ADMIN_PASSWORD=ton_mot_de_passe
```

2. L'interface de login est prête dans la page admin (à décommenter)

## 📝 Prochaines étapes

1. ✅ Créer configuration JSON - DONE
2. ⏳ Implémenter l'API pour sauvegarder les métadonnées
3. ⏳ Ajouter upload d'images
4. ⏳ Intégrer avec les composants existants
5. ⏳ Ajouter historique des versions

## 🛠️ Architecture

```
/app
  /admin
    page.tsx          # Interface admin
  /api
    /admin
      /images
        route.ts      # API pour lire/écrire config

/public
  images-config.json  # Métadonnées des images
  /brand
    /ai
      *.png           # Fichiers images
```

## 💡 Notes

- La configuration est stockée en JSON pour simplicité
- Les images sont en statiques dans `/public`
- Le système est modulaire et peut être étendu
- Aucune base de données requise pour commencer
