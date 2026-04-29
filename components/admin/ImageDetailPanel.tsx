"use client";

import React, { useState, useEffect } from "react";
import { ImageConfig, LABEL_OPTIONS } from "@/types/admin";

interface ImageDetailPanelProps {
  image: ImageConfig | null;
  onTitleSave: (newTitle: string) => void;
  onLabelChange: (newLabel: string) => void;
  onOrientationChange: (orientation: string) => void;
  onDelete: () => void;
  saving?: boolean;
  theme?: "dark" | "light";
}

export function ImageDetailPanel({
  image,
  onTitleSave,
  onLabelChange,
  onOrientationChange,
  onDelete,
  saving = false,
  theme = "dark",
}: ImageDetailPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const isLight = theme === "light";

  useEffect(() => {
    if (image) {
      setEditTitle(image.title);
    }
    setIsEditingTitle(false);
  }, [image]);

  if (!image) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className={`text-sm ${isLight ? "text-gray-400" : "text-gray-500"}`}>Sélectionnez une image</p>
        </div>
      </div>
    );
  }

  const aspectRatio =
    image.orientation === "portrait"
      ? "3/4"
      : image.orientation === "landscape"
      ? "16/9"
      : "1/1";

  const handleSaveTitle = () => {
    if (editTitle.trim()) {
      onTitleSave(editTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(image.title);
    setIsEditingTitle(false);
  };

  const sectionLabel = isLight ? "text-gray-500" : "text-gray-400";
  const surface = isLight ? "bg-gray-50 border-gray-200" : "bg-gray-800 border-gray-700";
  const surfaceHover = isLight ? "hover:bg-gray-100" : "hover:bg-gray-700";
  const textColor = isLight ? "text-gray-900" : "text-white";

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Preview */}
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase ${sectionLabel}`}>
          Aperçu
        </h3>
        <div
          className={`w-full rounded-lg overflow-hidden ${isLight ? "bg-gray-100" : "bg-gray-800"}`}
          style={{ aspectRatio }}
        >
          <img
            src={image.path}
            alt={image.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Title Editor */}
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase ${sectionLabel}`}>
          Titre
        </h3>
        {isEditingTitle ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className={`w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-red-600 ${surface} ${textColor}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleSaveTitle}
                disabled={saving}
                className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold rounded transition"
              >
                ✅ Valider
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className={`px-3 py-2 disabled:opacity-50 text-xs font-semibold rounded transition ${
                  isLight
                    ? "bg-gray-200 hover:bg-gray-300 text-gray-900"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className={`w-full text-left px-3 py-2 border rounded text-sm transition ${surface} ${surfaceHover} ${textColor}`}
          >
            {image.title} <span className={isLight ? "text-gray-400" : "text-gray-500"}>✏️</span>
          </button>
        )}
      </div>

      {/* Label Selector */}
      <div className={`space-y-2 p-3 rounded-lg border ${isLight ? "bg-red-50 border-red-200" : "bg-red-900/20 border-red-900/50"}`}>
        <h3 className={`text-xs font-semibold uppercase ${isLight ? "text-red-700" : "text-red-400"}`}>
          🏷️ Tag de l'image
        </h3>
        <select
          value={image.label || "Événement"}
          onChange={(e) => onLabelChange(e.target.value)}
          disabled={saving}
          className={`w-full px-3 py-2 border rounded text-sm font-semibold focus:outline-none focus:border-red-600 disabled:opacity-50 transition ${
            isLight
              ? "bg-white border-red-200 text-red-700"
              : "bg-red-900/30 border-red-900/70 text-red-300"
          }`}
        >
          {LABEL_OPTIONS.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Orientation Selector */}
      <div className="space-y-2">
        <h3 className={`text-xs font-semibold uppercase ${sectionLabel}`}>
          Format
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {["landscape", "square", "portrait"].map((orient) => {
            const active = image.orientation === orient;
            const cls = active
              ? "bg-red-600 text-white border border-red-600"
              : isLight
              ? "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
              : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700";
            return (
              <button
                key={orient}
                onClick={() => onOrientationChange(orient)}
                disabled={saving}
                className={`px-3 py-2 rounded text-xs font-semibold transition disabled:opacity-50 ${cls}`}
              >
                {orient === "landscape"
                  ? "⬅️➡️"
                  : orient === "portrait"
                  ? "⬇️"
                  : "⬜"}
                <span className="block text-xs mt-1 capitalize">{orient}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete Button */}
      <div className={`pt-4 border-t ${isLight ? "border-gray-200" : "border-gray-700"}`}>
        <button
          onClick={onDelete}
          disabled={saving}
          className={`w-full px-4 py-2 border rounded text-sm font-semibold transition disabled:opacity-50 ${
            isLight
              ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
              : "bg-red-900/30 hover:bg-red-900/50 border-red-900/70 text-red-400"
          }`}
        >
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
}
