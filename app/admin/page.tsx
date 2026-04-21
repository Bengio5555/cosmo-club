"use client";

import { useState, useEffect } from "react";
import { ImageConfig, Config, LABEL_OPTIONS } from "@/types/admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageListPanel } from "@/components/admin/ImageListPanel";
import { ImageDetailPanel } from "@/components/admin/ImageDetailPanel";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [selectedPage, setSelectedPage] = useState<string>("");
  const [selectedImageKey, setSelectedImageKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const savedLogin = localStorage.getItem("adminLogin") === "true";
    const savedPassword = localStorage.getItem("adminPassword");
    const savedPage = localStorage.getItem("selectedPage");

    if (savedLogin && savedPassword) {
      setIsLoggedIn(true);
      setPassword(savedPassword);
    }

    if (savedPage) {
      setSelectedPage(savedPage);
    }

    setIsLoading(false);
  }, []);

  // Save selectedPage to localStorage whenever it changes
  useEffect(() => {
    if (selectedPage) {
      localStorage.setItem("selectedPage", selectedPage);
    }
  }, [selectedPage]);

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
      localStorage.setItem("adminLogin", "true");
      localStorage.setItem("adminPassword", password);
      setMessage("");
    } else {
      setMessage("❌ Mot de passe incorrect");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword("");
    setConfig(null);
    localStorage.removeItem("adminLogin");
    localStorage.removeItem("adminPassword");
  };

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/images");
      if (res.ok) {
        const data = await res.json();

        // Load images from Vercel Blob and merge into selected page
        try {
          const blobRes = await fetch("/api/admin/blob-images", {
            headers: { "x-admin-password": password }
          });

          if (blobRes.ok) {
            const blobData = await blobRes.json();

            // Route blob images: prefixed filenames (`{page}__{key}__...`)
            // override their target slot; unprefixed fall back to evenements.
            if (blobData.images && blobData.images.length > 0) {
              if (!data.pages.evenements) {
                data.pages.evenements = {};
              }

              blobData.images.forEach((img: any) => {
                // Encode blob URL as base64 to match image-proxy expectation
                const encodedUrl = btoa(img.url);
                const proxyUrl = `/api/admin/image-proxy?url=${encodedUrl}`;
                const filename = img.filename as string;

                const prefixMatch = filename.match(/^([^_]+)__([^_]+)__(.+)$/);
                if (prefixMatch) {
                  const [, page, key] = prefixMatch;
                  if (!data.pages[page]) data.pages[page] = {};
                  const existing = data.pages[page][key] || {};
                  data.pages[page][key] = {
                    ...existing,
                    path: proxyUrl,
                  };
                  return;
                }

                // Unprefixed → evenements gallery
                const key = filename
                  .replace(/\.[^.]+$/, "")
                  .replace(/\W+/g, "-")
                  .toLowerCase();
                if (!data.pages.evenements[key]) {
                  data.pages.evenements[key] = {
                    title: filename.replace(/\.[^.]+$/, ""),
                    path: proxyUrl,
                    orientation: "landscape",
                    section: "evenements",
                    label: "Événement",
                  };
                }
              });
            }
          }
        } catch (err) {
          console.log("Blob load skipped:", err);
        }

        setConfig(data);
        const pages = Object.keys(data.pages);

        // If no page selected yet, choose first one
        if (!selectedPage && pages.length > 0) {
          setSelectedPage(pages[0]);
        }
        // If blob-uploads has new images, switch to it to show uploaded images
        else if (selectedPage && data.pages["blob-uploads"]?.["uploaded-0"]) {
          // Optional: auto-switch to blob-uploads if user just uploaded
          // setSelectedPage("blob-uploads");
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

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("imagePath", `/brand/ai/${file.name}`);
      formData.append("title", file.name.replace(/\.[^.]+$/, ""));
      formData.append("section", selectedPage);
      formData.append("orientation", "landscape");

      // If a slot is currently selected in the admin, treat this upload as
      // a REPLACEMENT for that slot on the current page. The upload API
      // will prefix the blob filename so readers route it correctly.
      if (selectedPage && selectedImageKey) {
        formData.append("targetPage", selectedPage);
        formData.append("targetKey", selectedImageKey);
      }

      console.log("Starting upload...", {
        file: file.name,
        page: selectedPage,
        replacingSlot: selectedImageKey || null,
      });

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: {
          "x-admin-password": password,
        },
        body: formData,
      });

      console.log("Upload response:", { status: res.status, ok: res.ok });

      let data;
      try {
        data = await res.json();
        console.log("Response data:", data);
      } catch (parseErr) {
        console.error("Failed to parse JSON response:", parseErr);
        setMessage(`❌ Erreur de réponse API (non-JSON): ${res.status} ${res.statusText}`);
        return;
      }

      if (res.ok) {
        console.log("Upload successful!");
        setMessage("✅ Image uploadée avec succès!");
        await loadConfig();
        setTimeout(() => setMessage(""), 3000);
      } else {
        // Show detailed error message
        const errorMsg = data.error || "Erreur lors de l'upload";
        const details = data.details ? ` - ${data.details}` : "";
        const tokenInfo = data.tokenExists === false ? " [❌ Token manquant]" : data.tokenExists === true ? " [✅ Token OK]" : "";
        const fullMsg = `❌ ${errorMsg}${details}${tokenInfo}`;
        console.error("Upload error:", fullMsg, data);
        setMessage(fullMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("Upload catch error:", err);
      setMessage(`❌ Erreur réseau: ${errorMsg}`);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleTitleSave = async (newTitle: string) => {
    if (!config || !selectedImageKey) return;
    const updated = JSON.parse(JSON.stringify(config));
    updated.pages[selectedPage][selectedImageKey].title = newTitle;
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleOrientationChange = async (orientation: string) => {
    if (!config || !selectedImageKey) return;
    const updated = JSON.parse(JSON.stringify(config));
    updated.pages[selectedPage][selectedImageKey].orientation = orientation;
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleLabelChange = async (label: string) => {
    if (!config || !selectedImageKey) return;
    const updated = JSON.parse(JSON.stringify(config));
    updated.pages[selectedPage][selectedImageKey].label = label;
    setConfig(updated);
    await saveConfig(updated);
  };

  const handleDeleteImage = async () => {
    if (!config || !selectedImageKey || !window.confirm("Supprimer cette image?")) return;

    const imageData = config.pages[selectedPage][selectedImageKey];
    const isUploadedImage = imageData?.path?.includes("/api/admin/image-proxy");

    if (!isUploadedImage) {
      setMessage("❌ Les images statiques ne peuvent pas être supprimées (utilisez le site pour les modifier)");
      return;
    }

    // Delete uploaded image from Blob
    try {
      // Extract blob URL from proxy URL (decoded from base64)
      const proxyUrl = imageData.path;
      const encodedParam = new URLSearchParams(proxyUrl.split("?")[1]).get("url");

      if (!encodedParam) {
        setMessage("❌ Impossible de supprimer: URL invalide");
        return;
      }

      // Decode base64 to recover the original blob URL
      let blobUrl: string;
      try {
        blobUrl = atob(encodedParam);
      } catch {
        // Fallback: treat as already-decoded URL (older uploads)
        blobUrl = encodedParam;
      }

      const deleteRes = await fetch("/api/admin/delete-image", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ url: blobUrl }),
      });

      if (deleteRes.ok) {
        const updated = JSON.parse(JSON.stringify(config));
        delete updated.pages[selectedPage][selectedImageKey];
        setConfig(updated);
        setSelectedImageKey(null); // Deselect after delete
        setMessage("✅ Image supprimée!");
        setTimeout(() => setMessage(""), 2000);
      } else {
        const err = await deleteRes.json();
        setMessage(`❌ Erreur: ${err.error}`);
      }
    } catch (err) {
      setMessage("❌ Erreur de suppression");
    }
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
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.message || "Erreur de sauvegarde (Vercel filesystem read-only)";
        setMessage(`❌ ${errorMsg}`);
      }
    } catch (err) {
      setMessage("❌ Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  // Show loading screen while checking localStorage
  if (isLoading) {
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
        <p style={{ color: "#999", fontSize: "0.875rem" }}>Chargement...</p>
      </div>
    );
  }

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
            onClick={handleLogout}
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

        <div className="grid grid-cols-[220px_1fr] gap-6 mb-6">
          {/* Sidebar - Page Navigation */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">
              Pages
            </h3>
            <div className="flex flex-col gap-2">
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => {
                    setSelectedPage(page);
                    setSelectedImageKey(null); // Reset selection when changing pages
                  }}
                  className={`text-left px-3 py-2 rounded text-sm font-medium transition ${
                    selectedPage === page
                      ? "bg-red-600 text-white border border-red-600"
                      : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Two Panel Layout */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-white capitalize">
                {selectedPage} ({Object.keys(currentPageData).length} images)
              </h2>
            </div>

            <AdminLayout
              leftPanel={
                <ImageListPanel
                  images={currentPageData}
                  selectedKey={selectedImageKey}
                  onSelectImage={setSelectedImageKey}
                  onUpload={handleImageUpload}
                  uploading={uploading}
                />
              }
              rightPanel={
                selectedImageKey && currentPageData[selectedImageKey] ? (
                  <ImageDetailPanel
                    image={currentPageData[selectedImageKey]}
                    onTitleSave={handleTitleSave}
                    onLabelChange={handleLabelChange}
                    onOrientationChange={handleOrientationChange}
                    onDelete={handleDeleteImage}
                    saving={saving}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm mb-2">👈 Sélectionnez une image</p>
                      <p className="text-gray-600 text-xs">pour voir les détails</p>
                    </div>
                  </div>
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
