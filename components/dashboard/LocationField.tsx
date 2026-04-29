"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

type Suggestion = { label: string };

/**
 * Address input with autocomplete (api-adresse.data.gouv.fr — free,
 * no API key, French addresses) plus a "view on map" Google Maps
 * shortcut. The map link works with any free-form input, the
 * autocomplete only fires on French addresses.
 */
export function LocationField({
  name,
  value,
  onChange,
  placeholder,
  inputClassName,
  readOnly,
  required,
  autoFocus,
}: {
  name?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputClassName?: string;
  readOnly?: boolean;
  required?: boolean;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const justPickedRef = useRef(false);

  // Debounced lookup against the French government BAN/BAL geocoder.
  useEffect(() => {
    if (readOnly) return;
    if (justPickedRef.current) {
      justPickedRef.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return;
        const data = await res.json();
        const items: Suggestion[] = (data.features ?? [])
          .map((f: { properties?: { label?: string } }) => ({
            label: f.properties?.label ?? "",
          }))
          .filter((s: Suggestion) => s.label);
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIdx(-1);
      } catch (err) {
        // Network errors are non-fatal — input still works as plain text.
        if ((err as Error).name !== "AbortError") {
          console.warn("[LocationField] suggest failed:", err);
        }
      }
    }, 250);
    return () => {
      clearTimeout(handle);
      ctrl.abort();
    };
  }, [value, readOnly]);

  // Close popup on outside click.
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function pick(label: string) {
    justPickedRef.current = true;
    onChange(label);
    setOpen(false);
    setActiveIdx(-1);
  }

  const trimmed = value.trim();
  const mapHref = trimmed
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trimmed)}`
    : null;

  return (
    <div ref={wrapperRef} className="relative flex items-stretch gap-2">
      <div className="relative flex-1">
        <input
          name={name}
          type="text"
          value={value}
          autoComplete="off"
          readOnly={readOnly}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (!open || suggestions.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIdx((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && activeIdx >= 0) {
              e.preventDefault();
              pick(suggestions[activeIdx].label);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className={inputClassName}
        />
        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950 shadow-lg"
          >
            {suggestions.map((s, i) => (
              <li key={`${s.label}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pick(s.label)}
                  className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                    i === activeIdx
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-300 hover:bg-neutral-900"
                  }`}
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <a
        href={mapHref ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Voir sur la carte"
        title={mapHref ? "Voir sur Google Maps" : "Renseigne d'abord une adresse"}
        onClick={(e) => {
          if (!mapHref) e.preventDefault();
        }}
        className={`inline-flex shrink-0 items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 px-2.5 text-neutral-400 transition-colors hover:border-neutral-700 hover:text-white ${
          !mapHref ? "pointer-events-none opacity-40" : ""
        }`}
      >
        <MapPin className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
