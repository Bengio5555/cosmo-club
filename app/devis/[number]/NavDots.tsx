"use client";

import { useEffect, useState } from "react";

const SECTION_IDS = [
  "cover",
  "lettre",
  "moodboard",
  "offre",
  "chiffrage",
  "signature",
] as const;

export function NavDots() {
  const [active, setActive] = useState<string>("cover");

  useEffect(() => {
    // Resolve only the sections that actually exist in the DOM (some may
    // be absent when the quote has no intro / no items).
    const nodes = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (n): n is HTMLElement => !!n,
    );
    if (nodes.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { threshold: [0.4, 0.6], rootMargin: "-20% 0px -20% 0px" },
    );

    nodes.forEach((n) => obs.observe(n));
    return () => obs.disconnect();
  }, []);

  function go(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav className="nav-indicator" aria-label="Sections du devis">
      {SECTION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => go(id)}
          aria-label={`Aller à ${id}`}
          className={`nav-dot${active === id ? " active" : ""}`}
        />
      ))}
    </nav>
  );
}
