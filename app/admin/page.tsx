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
        setMessage("✅ Sauvegardé");
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
        }}
      >
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
            Admin
          </h1>
          <p style={{ color: "#999", marginBottom: "2rem", fontSize: "0.875rem" }}>
            Cosmo Club Paris
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
    <div style={{ minHeight: "100vh", background: "#000", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: "bold", color: "white", margin: "0" }}>
              Gestion des Images
            </h1>
            <p style={{ color: "#999", margin: "0.5rem 0 0 0", fontSize: "0.875rem" }}>
              Cosmo Club Paris
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
          <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "rgba(185, 28, 28, 0.2)", borderLeft: "3px solid #b91c1c", color: "white", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem" }}>
          {/* Sidebar */}
          <div style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(10px)", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid rgba(255,255,255,0.1)", height: "fit-content" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "white", marginBottom: "1rem" }}>Pages</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => setSelectedPage(page)}
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    background: selectedPage === page ? "#b91c1c" : "transparent",
                    color: "white",
                    border: "1px solid " + (selectedPage === page ? "#b91c1c" : "transparent"),
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: selectedPage === page ? "500" : "400",
                    transition: "all 0.2s",
                  }}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "white", marginBottom: "1.5rem", textTransform: "capitalize" }}>
              {selectedPage}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }}>
              {Object.entries(currentPageData).map(([key, image]) => (
                <div
                  key={key}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    backdropFilter: "blur(10px)",
                    padding: "1.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "bold", color: "white", margin: "0 0 0.5rem 0" }}>
                    {image.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "#999", margin: "0 0 1rem 0" }}>
                    {image.section}
                  </p>

                  {/* Image Preview */}
                  <div
                    style={{
                      marginBottom: "1rem",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: "0.5rem",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
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
                  </div>

                  {/* Orientation Controls */}
                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                      Orientation
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                      {["portrait", "landscape", "square"].map((orient) => (
                        <button
                          key={orient}
                          onClick={() => updateOrientation(selectedPage, key, orient)}
                          disabled={saving}
                          style={{
                            padding: "0.5rem",
                            fontSize: "0.75rem",
                            borderRadius: "0.375rem",
                            background:
                              image.orientation === orient
                                ? "#b91c1c"
                                : "rgba(255,255,255,0.1)",
                            color: "white",
                            border: "1px solid " + (image.orientation === orient ? "#b91c1c" : "rgba(255,255,255,0.2)"),
                            cursor: saving ? "not-allowed" : "pointer",
                            opacity: saving ? 0.7 : 1,
                            fontWeight: image.orientation === orient ? "500" : "400",
                            textTransform: "capitalize",
                          }}
                        >
                          {orient}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* File Info */}
                  <div
                    style={{
                      padding: "0.75rem",
                      background: "rgba(0,0,0,0.5)",
                      borderRadius: "0.375rem",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p style={{ fontSize: "0.75rem", color: "#666", margin: "0 0 0.25rem 0" }}>
                      Chemin:
                    </p>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "#999",
                        fontFamily: "monospace",
                        wordBreak: "break-all",
                        margin: 0,
                      }}
                    >
                      {image.path}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
