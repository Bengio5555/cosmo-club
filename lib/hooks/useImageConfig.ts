"use client";

import { useEffect, useState } from "react";

export type ImageSlot = {
  path?: string;
  title?: string;
  orientation?: string;
  section?: string;
  label?: string;
  [key: string]: unknown;
};

export type ImageConfig = {
  pages?: Record<string, Record<string, ImageSlot>>;
};

// Module-level cache so multiple components that mount on the same page
// do not each trigger a request. The config is small, lives on Vercel's
// edge cache, and changes only when the admin uploads — a simple
// in-memory cache per page load is safe.
let cachedConfig: ImageConfig | null = null;
let pending: Promise<ImageConfig | null> | null = null;

function fetchConfig(): Promise<ImageConfig | null> {
  if (cachedConfig) return Promise.resolve(cachedConfig);
  if (pending) return pending;
  pending = fetch("/api/images-full")
    .then((res) => (res.ok ? (res.json() as Promise<ImageConfig>) : null))
    .then((c) => {
      cachedConfig = c;
      pending = null;
      return c;
    })
    .catch(() => {
      pending = null;
      return null;
    });
  return pending;
}

/**
 * Hook that returns the live images config merged from images-config.json
 * and Vercel Blob uploads (routed by filename prefix). Components use this
 * to read `config.pages[page][key].path` and fall back to a static default.
 */
export function useImageConfig(): ImageConfig | null {
  const [config, setConfig] = useState<ImageConfig | null>(cachedConfig);
  useEffect(() => {
    let cancelled = false;
    fetchConfig().then((c) => {
      if (!cancelled) setConfig(c);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return config;
}

/**
 * Convenience helper to read one slot's path with a fallback, e.g.
 *   const hero = pickPath(config, "home", "hero", "/brand/ai/hero-home.png")
 */
export function pickPath(
  config: ImageConfig | null,
  page: string,
  key: string,
  fallback: string,
): string {
  return config?.pages?.[page]?.[key]?.path || fallback;
}
