"use client";

import React from "react";

interface AdminLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  theme?: "dark" | "light";
}

export function AdminLayout({ leftPanel, rightPanel, theme = "dark" }: AdminLayoutProps) {
  const panelClass =
    theme === "light"
      ? "bg-white border-gray-200"
      : "bg-gray-900 border-gray-800";

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Panel */}
      <div className={`w-[350px] rounded-lg border flex flex-col overflow-hidden ${panelClass}`}>
        {leftPanel}
      </div>

      {/* Right Panel */}
      <div className={`flex-1 rounded-lg border overflow-hidden ${panelClass}`}>
        {rightPanel}
      </div>
    </div>
  );
}
