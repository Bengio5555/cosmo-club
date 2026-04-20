"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export const Label = ({
  children,
  htmlFor,
  eyebrow,
}: {
  children: React.ReactNode;
  htmlFor?: string;
  eyebrow?: string;
}) => (
  <label htmlFor={htmlFor} className="flex flex-col gap-2">
    {eyebrow && <span className="eyebrow">{eyebrow}</span>}
    <span className="font-display text-lg text-[color:var(--color-ink-text)]">{children}</span>
  </label>
);

export const FieldShell = ({
  label,
  error,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  htmlFor?: string;
}) => (
  <div className="space-y-2">
    <label
      htmlFor={htmlFor}
      className="block text-[11px] uppercase tracking-[0.28em] text-[color:var(--color-espresso)]/70"
    >
      {label}
    </label>
    {children}
    <div className="flex items-start justify-between gap-4 text-xs">
      {error ? (
        <span className="text-[color:var(--color-grenat-glow)]">{error}</span>
      ) : hint ? (
        <span className="text-[color:var(--color-espresso)]/50">{hint}</span>
      ) : (
        <span />
      )}
    </div>
  </div>
);

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          "w-full bg-transparent border-b border-[color:var(--color-ash)] pb-3 pt-1",
          "font-display text-xl text-[color:var(--color-ink-text)] placeholder:text-[color:var(--color-espresso)]/30",
          "outline-none transition-colors duration-300 focus:border-[color:var(--color-or)]",
          className,
        )}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={5}
        {...props}
        className={cn(
          "w-full bg-transparent border border-[color:var(--color-ash)] rounded-[var(--radius-md)] p-4",
          "text-base text-[color:var(--color-ink-text)] placeholder:text-[color:var(--color-espresso)]/30",
          "outline-none transition-colors duration-300 focus:border-[color:var(--color-or)]",
          "resize-none",
          className,
        )}
      />
    );
  },
);

export function OptionCard({
  selected,
  onClick,
  title,
  description,
  index,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  index: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group relative flex w-full flex-col overflow-hidden rounded-[var(--radius-xl)] border p-6 text-left transition-all duration-500 ease-[var(--ease-silk)] md:p-8",
        selected
          ? "border-[color:var(--color-or)] bg-[color:var(--color-cream)]"
          : "border-[color:var(--color-ash)]/60 bg-[color:var(--color-cream)]/50 hover:border-[color:var(--color-or)]/60",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-700",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-60",
        )}
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 80% 20%, rgba(201,169,97,0.18), transparent 60%)",
        }}
      />
      <div className="relative flex items-start justify-between gap-6">
        <span className="font-display text-sm tracking-[0.3em] text-[color:var(--color-or)]">
          {index}
        </span>
        <span
          aria-hidden
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-500",
            selected
              ? "border-[color:var(--color-or)] bg-[color:var(--color-or)]"
              : "border-[color:var(--color-ash)]",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full transition-colors duration-500",
              selected ? "bg-[color:var(--color-cream-paper)]" : "bg-transparent",
            )}
          />
        </span>
      </div>
      <h3 className="relative mt-6 font-display text-2xl text-[color:var(--color-ink-text)] md:text-3xl">
        {title}
      </h3>
      <p className="relative mt-2 text-sm leading-relaxed text-[color:var(--color-espresso)]/75">
        {description}
      </p>
    </button>
  );
}
