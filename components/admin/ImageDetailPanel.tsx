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
}

export function ImageDetailPanel({
  image,
  onTitleSave,
  onLabelChange,
  onOrientationChange,
  onDelete,
  saving = false,
}: ImageDetailPanelProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

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
          <p className="text-gray-500 text-sm">Sélectionnez une image</p>
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

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Preview */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-gray-400 uppercase">
          Aperçu
        </h3>
        <div
          className="w-full bg-gray-800 rounded-lg overflow-hidden"
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
        <h3 className="text-xs font-semibold text-gray-400 uppercase">
          Titre
        </h3>
        {isEditingTitle ? (
          <div className="space-y-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-red-600"
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
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-xs font-semibold rounded transition"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-sm text-white transition"
          >
            {image.title} <span className="text-gray-500">✏️</span>
          </button>
        )}
      </div>

      {/* Label Selector */}
      <div className="space-y-2 p-3 bg-red-900/20 border border-red-900/50 rounded-lg">
        <h3 className="text-xs font-semibold text-red-400 uppercase">
          🏷️ Tag de l'image
        </h3>
        <select
          value={image.label || "Événement"}
          onChange={(e) => onLabelChange(e.target.value)}
          disabled={saving}
          className="w-full px-3 py-2 bg-red-900/30 border border-red-900/70 rounded text-sm text-red-300 font-semibold focus:outline-none focus:border-red-600 disabled:opacity-50 transition"
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
        <h3 className="text-xs font-semibold text-gray-400 uppercase">
          Format
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {["landscape", "square", "portrait"].map((orient) => (
            <button
              key={orient}
              onClick={() => onOrientationChange(orient)}
              disabled={saving}
              className={`px-3 py-2 rounded text-xs font-semibold transition ${
                image.orientation === orient
                  ? "bg-red-600 text-white border border-red-600"
                  : "bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700"
              } disabled:opacity-50`}
            >
              {orient === "landscape"
                ? "⬅️➡️"
                : orient === "portrait"
                ? "⬇️"
                : "⬜"}
              <span className="block text-xs mt-1 capitalize">{orient}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Delete Button */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={onDelete}
          disabled={saving}
          className="w-full px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-900/70 rounded text-sm font-semibold text-red-400 transition disabled:opacity-50"
        >
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
}
