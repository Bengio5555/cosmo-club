"use client";

export default function AdminPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "2rem", color: "white" }}>
      <h1>Admin Cosmo Club</h1>
      <p>Système d'admin en développement</p>
      <p>📋 <strong>Fichiers créés :</strong></p>
      <ul>
        <li><code>/public/images-config.json</code> - Configuration des images</li>
      </ul>
      <p>🔄 <strong>Prochaines étapes :</strong></p>
      <ol>
        <li>Créer une API pour lire/écrire la config</li>
        <li>Ajouter l'interface de gestion</li>
        <li>Intégrer les images</li>
      </ol>
    </div>
  );
}
