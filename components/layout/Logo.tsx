import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import logoSrc from "@/public/brand/cosmo-logo.avif";

export function Logo({
  className,
  compact = false,
  variant = "mark",
}: {
  className?: string;
  compact?: boolean;
  /** `mark` = wordmark seul · `sign` = dot + "Cosmo Club" (fallback typo-only) */
  variant?: "mark" | "sign";
}) {
  if (variant === "sign") {
    return (
      <Link
        href="/"
        aria-label="Cosmo Club — accueil"
        className={cn(
          "group inline-flex items-center gap-2 font-display tracking-[0.22em] uppercase",
          compact ? "text-[13px]" : "text-sm",
          className,
        )}
      >
        <span className="relative inline-flex h-[10px] w-[10px] items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-[color:var(--color-or)] opacity-80 transition-transform duration-500 ease-[var(--ease-silk)] group-hover:scale-125" />
          <span className="absolute inset-[3px] rounded-full bg-[color:var(--color-grenat)] transition-colors duration-500 group-hover:bg-[color:var(--color-or)]" />
        </span>
        <span>Cosmo&nbsp;Club</span>
      </Link>
    );
  }

  const height = compact ? 22 : 28;
  const width = Math.round((304 / 106) * height);

  return (
    <Link
      href="/"
      aria-label="Cosmo Club — accueil"
      className={cn(
        "group relative inline-flex items-center transition-opacity duration-500 hover:opacity-85",
        className,
      )}
    >
      <Image
        src={logoSrc}
        alt="Cosmo Club"
        width={width}
        height={height}
        priority
        unoptimized
        className="h-auto w-auto select-none"
        style={{ height, width }}
      />
    </Link>
  );
}
