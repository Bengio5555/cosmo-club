"use client";

import React from "react";

interface AdminLayoutProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export function AdminLayout({ leftPanel, rightPanel }: AdminLayoutProps) {
  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Left Panel */}
      <div className="w-[350px] bg-gray-900 rounded-lg border border-gray-800 flex flex-col overflow-hidden">
        {leftPanel}
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        {rightPanel}
      </div>
    </div>
  );
}
