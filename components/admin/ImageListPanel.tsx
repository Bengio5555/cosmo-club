"use client";

import React, { useRef } from "react";
import { ImageConfig } from "@/types/admin";

interface ImageListPanelProps {
  images: Record<string, ImageConfig>;
  selectedKey: string | null;
  onSelectImage: (key: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  theme?: "dark" | "light";
}

export function ImageListPanel({
  images,
  selectedKey,
  onSelectImage,
  onUpload,
  uploading,
  theme = "dark",
}: ImageListPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLight = theme === "light";

  const imageEntries = Object.entries(images);

  return (
    <div className="flex flex-col h-full">
      {/* Upload Zone */}
      <div className={`p-4 border-b ${isLight ? "border-gray-200" : "border-gray-700"}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={onUpload}
          disabled={uploading}
          className="hidden"
          id="admin-file-input"
        />
        <label
          htmlFor="admin-file-input"
          className={`block cursor-pointer p-3 border-2 border-dashed border-red-600 rounded text-center transition ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          } ${
            isLight
              ? "bg-gray-50 hover:bg-gray-100"
              : "bg-gray-800 hover:bg-gray-700"
          }`}
        >
          <p className={`text-sm font-bold m-0 ${isLight ? "text-gray-900" : "text-white"}`}>
            {uploading
              ? "⬆️ Upload..."
              : selectedKey
              ? "🔄 Remplacer l'image"
              : "⬆️ Importer"}
          </p>
          <p className={`text-xs m-0 ${isLight ? "text-gray-500" : "text-gray-400"}`}>
            {uploading
              ? "En cours..."
              : selectedKey
              ? `Slot sélectionné : ${selectedKey}`
              : "Clique ou glisse"}
          </p>
        </label>
      </div>

      {/* Images List */}
      <div className="flex-1 overflow-y-auto">
        {imageEntries.length === 0 ? (
          <div className={`p-4 text-center text-sm ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Aucune image
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {imageEntries.map(([key, image]) => {
              const isSelected = selectedKey === key;
              const baseClass = isLight
                ? isSelected
                  ? "bg-gray-100 border-2 border-red-600"
                  : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                : isSelected
                ? "bg-gray-800 border-2 border-red-600"
                : "bg-gray-800/50 border-2 border-transparent hover:bg-gray-700";
              return (
                <button
                  key={key}
                  onClick={() => onSelectImage(key)}
                  className={`w-full flex gap-3 p-2 rounded text-left transition ${baseClass}`}
                >
                  {/* Thumbnail */}
                  <div className={`w-16 h-16 flex-shrink-0 rounded overflow-hidden ${isLight ? "bg-gray-200" : "bg-gray-700"}`}>
                    <img
                      src={image.path}
                      alt={image.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isLight ? "text-gray-900" : "text-white"}`}>
                      {image.title}
                    </p>
                    <p className={`text-xs truncate ${isLight ? "text-gray-500" : "text-gray-500"}`}>
                      {image.orientation === "portrait"
                        ? "⬇️"
                        : image.orientation === "landscape"
                        ? "⬅️➡️"
                        : "⬜"}{" "}
                      {image.label || "Événement"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
