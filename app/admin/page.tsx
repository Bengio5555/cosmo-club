"use client";

import { useState, useEffect } from "react";

interface ImageConfig {
  title: string;
  path: string;
  orientation: "portrait" | "landscape" | "square";
  section: string;
}

interface Config {
  pages: Record<string, Record<string, ImageConfig>>;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isLoggedIn && !config) {
      loadConfig();
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultPassword = "admin2024";
    if (password === defaultPassword) {
      setIsLoggedIn(true);
      setMessage("");
    } else {
      setMessage("❌ Mot de passe incorrect");
      setPassword("");
    }
  };

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        const pages = Object.keys(data.pages);
        if (pages.length > 0) {
          setSelectedPage(pages[0]);
        }
      }
    } catch (err) {
      setMessage("❌ Erreur de chargement");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !config) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("page", selectedPage);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-password": password,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMessage("✅ Image uploadée avec succès!");
        await loadConfig();
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage("❌ Erreur lors de l'upload");
      }
    } catch (err) {
      setMessage("❌ Erreur réseau");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const updateImageTitle = async (page: string, key: string, newTitle: string) => {
    if (!config) return;
    const updated = JSON.parse(JSON.stringify(config));
    updated.pages[page][key].title = newTitle;
    setConfig(updated);
    await saveConfig(updated);
    setEditingKey(null);
  };

  const updateOrientation = async (
    page: string,
    key: string,
    orientation: string
  ) => {
    if (!config) return;
    const updated = JSON.parse(JSON.stringify(config));
    updated.pages[page][key].orientation = orientation;
    setConfig(updated);
    await saveConfig(updated);
  };

  const deleteImage = async (page: string, key: string) => {
    if (!config || !window.confirm("Supprimer cette image?")) return;
    const updated = JSON.parse(JSON.stringify(config));
    delete updated.pages[page][key];
    setConfig(updated);
    await saveConfig(updated);
    setMessage("✅ Image supprimée");
    setTimeout(() => setMessage(""), 2000);
  };

  const saveConfig = async (data: Config) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/images", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        setMessage("✅ Sauvegardé!");
        setTimeout(() => setMessage(""), 2000);
      } else {
        setMessage("❌ Erreur de sauvegarde");
      }
    } catch (err) {
      setMessage("❌ Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, -apple-system, sans-serif",
          cursor: "auto",
        }}
      >
        <style>{`
          html, body, div { cursor: auto !important; }
        `}</style>
        <form
          onSubmit={handleLogin}
          style={{
            background: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(10px)",
            padding: "2.5rem",
            borderRadius: "0.75rem",
            width: "100%",
            maxWidth: "400px",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <h1 style={{ fontSize: "1.75rem", fontWeight: "bold", color: "white", marginBottom: "0.5rem" }}>
            Admin Cosmo Club
          </h1>
          <p style={{ color: "#999", marginBottom: "2rem", fontSize: "0.875rem" }}>
            Gestion des Images
          </p>

          <input
            type="password"
            placeholder="Mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "0.5rem",
              background: "rgba(255,255,255,0.1)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.2)",
              fontSize: "1rem",
              boxSizing: "border-box",
            }}
          />

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#b91c1c",
              color: "white",
              fontWeight: "bold",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              border: "none",
              fontSize: "1rem",
            }}
          >
            Connexion
          </button>

          {message && (
            <p style={{ marginTop: "1rem", color: "#999", fontSize: "0.875rem", textAlign: "center" }}>
              {message}
            </p>
          )}
        </form>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: "2rem", color: "white", textAlign: "center", background: "#000", minHeight: "100vh" }}>
        ⏳ Chargement...
      </div>
    );
  }

  const pages = Object.keys(config.pages);
  const currentPageData = config.pages[selectedPage] || {};

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif", cursor: "auto" }}>
      <style>{`
        html, body, * { cursor: auto !important; }
        button { cursor: pointer !important; }
        input { cursor: text !important; }
        label { cursor: pointer !important; }
        a { cursor: pointer !important; }
      `}</style>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "white", margin: "0" }}>
              📸 Gestion Images
            </h1>
            <p style={{ color: "#999", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
              Upload, modifier, sauvegarder
            </p>
          </div>
          <button
            onClick={() => setIsLoggedIn(false)}
            style={{
              background: "#b91c1c",
              color: "white",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              border: "none",
              fontSize: "0.875rem",
              fontWeight: "500",
            }}
          >
            Déconnexion
          </button>
        </div>

        {/* Message */}
        {message && (
          <div style={{ marginBottom: "1rem", padding: "1rem", background: message.includes("✅") ? "rgba(34, 197, 94, 0.2)" : "rgba(185, 28, 28, 0.2)", borderLeft: `3px solid ${message.includes("✅") ? "#22c55e" : "#b91c1c"}`, color: "white", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "2rem" }}>
          {/* Sidebar */}
          <div>
            <h3 style={{ fontSize: "0.875rem", fontWeight: "bold", color: "#999", textTransform: "uppercase", marginBottom: "1rem" }}>
              Pages
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => setSelectedPage(page)}
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    background: selectedPage === page ? "#b91c1c" : "rgba(255,255,255,0.05)",
                    color: "white",
                    border: "1px solid " + (selectedPage === page ? "#b91c1c" : "rgba(255,255,255,0.1)"),
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: selectedPage === page ? "600" : "400",
                    transition: "all 0.2s",
                    textTransform: "capitalize",
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div>
            {/* Upload Zone */}
            <div
              style={{
                marginBottom: "2rem",
                padding: "2rem",
                background: "rgba(185, 28, 28, 0.1)",
                border: "2px dashed #b91c1c",
                borderRadius: "0.75rem",
                textAlign: "center",
              }}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{
                  display: "none",
                }}
                id="file-input"
              />
              <label
                htmlFor="file-input"
                style={{
                  display: "block",
                  cursor: uploading ? "not-allowed" : "pointer",
                  opacity: uploading ? 0.5 : 1,
                }}
              >
                <p style={{ fontSize: "1.125rem", fontWeight: "bold", color: "white", margin: "0 0 0.5rem 0" }}>
                  ⬆️ {uploading ? "Upload en cours..." : "Uploader une image"}
                </p>
                <p style={{ color: "#999", fontSize: "0.875rem", margin: 0 }}>
                  {uploading ? "Patiente..." : "Clique ou glisse une image"}
                </p>
              </label>
            </div>

            {/* Upload Info */}
            <div
              style={{
                marginBottom: "2rem",
                padding: "1.5rem",
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.5)",
                borderRadius: "0.75rem",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "#60a5fa", margin: "0 0 0.75rem 0", fontWeight: "bold" }}>
                💡 Comment ajouter une image :
              </p>
              <ol style={{ fontSize: "0.8rem", color: "#999", margin: "0", paddingLeft: "1.25rem", lineHeight: "1.6" }}>
                <li>Ajoute le fichier image à <code style={{ background: "rgba(0,0,0,0.5)", padding: "0.2rem 0.4rem", borderRadius: "0.25rem" }}>/public/brand/ai/</code></li>
                <li>Commit et push sur GitHub</li>
                <li>Vercel redéploie automatiquement</li>
                <li>L'image apparaît ici - tu peux l'éditer</li>
              </ol>
            </div>

            {/* Images Grid */}
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold", color: "white", marginBottom: "1.5rem", textTransform: "capitalize" }}>
                {selectedPage} ({Object.keys(currentPageData).length} images)
              </h2>

              {Object.keys(currentPageData).length === 0 ? (
                <p style={{ color: "#999", textAlign: "center", padding: "2rem" }}>
                  Aucune image pour cette page
                </p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                  {Object.entries(currentPageData).map(([key, image]) => (
                    <div
                      key={key}
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "0.75rem",
                        overflow: "hidden",
                        transition: "all 0.2s",
                      }}
                    >
                      {/* Image Preview */}
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          aspectRatio:
                            image.orientation === "portrait"
                              ? "3/4"
                              : image.orientation === "landscape"
                              ? "16/9"
                              : "1/1",
                          background: "#1a1a1a",
                          overflow: "hidden",
                        }}
                      >
                        <img
                          src={image.path}
                          alt={image.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>

                      {/* Info & Controls */}
                      <div style={{ padding: "1.25rem" }}>
                        {/* Title Edit */}
                        {editingKey === key ? (
                          <div style={{ marginBottom: "1rem" }}>
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "0.5rem",
                                marginBottom: "0.5rem",
                                borderRadius: "0.375rem",
                                background: "rgba(255,255,255,0.1)",
                                color: "white",
                                border: "1px solid rgba(255,255,255,0.2)",
                                fontSize: "0.875rem",
                                boxSizing: "border-box",
                              }}
                            />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                              <button
                                onClick={() => updateImageTitle(selectedPage, key, editingTitle)}
                                style={{
                                  padding: "0.5rem",
                                  background: "#22c55e",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.375rem",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold",
                                }}
                              >
                                ✅ Valider
                              </button>
                              <button
                                onClick={() => setEditingKey(null)}
                                style={{
                                  padding: "0.5rem",
                                  background: "rgba(255,255,255,0.1)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "0.375rem",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginBottom: "1rem" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", margin: "0 0 0.25rem 0", cursor: "pointer" }} onClick={() => { setEditingKey(key); setEditingTitle(image.title); }}>
                              {image.title} ✏️
                            </h3>
                            <p style={{ fontSize: "0.75rem", color: "#999", margin: "0", textTransform: "uppercase" }}>
                              {image.section}
                            </p>
                          </div>
                        )}

                        {/* Orientation Buttons */}
                        <div style={{ marginBottom: "1rem" }}>
                          <p style={{ fontSize: "0.65rem", color: "#666", margin: "0 0 0.5rem 0", textTransform: "uppercase" }}>
                            Format
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.375rem" }}>
                            {["landscape", "square", "portrait"].map((orient) => (
                              <button
                                key={orient}
                                onClick={() => updateOrientation(selectedPage, key, orient)}
                                disabled={saving}
                                style={{
                                  padding: "0.4rem 0.375rem",
                                  fontSize: "0.65rem",
                                  borderRadius: "0.3rem",
                                  background:
                                    image.orientation === orient
                                      ? "#b91c1c"
                                      : "rgba(255,255,255,0.05)",
                                  color: "white",
                                  border: "1px solid " + (image.orientation === orient ? "#b91c1c" : "rgba(255,255,255,0.1)"),
                                  cursor: saving ? "not-allowed" : "pointer",
                                  fontWeight: image.orientation === orient ? "600" : "400",
                                  textTransform: "capitalize",
                                }}
                              >
                                {orient === "landscape" ? "⬅️➡️" : orient === "portrait" ? "⬇️" : "⬜"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => deleteImage(selectedPage, key)}
                          style={{
                            width: "100%",
                            padding: "0.5rem",
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#ef4444",
                            border: "1px solid rgba(239, 68, 68, 0.5)",
                            borderRadius: "0.375rem",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
