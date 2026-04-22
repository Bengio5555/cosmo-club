import Link from "next/link";
import { ExternalLink, ImageIcon } from "lucide-react";

export default function DashboardImagesPage() {
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Images du site
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Remplacement des visuels publics (hero, bento, lattes, événements).
        </p>
      </header>

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-lg bg-neutral-900 p-3 text-neutral-400">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white">
              Gestion des images
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-neutral-400">
              L&apos;interface d&apos;upload images par slot (Mac Finder two-panel)
              reste temporairement sur l&apos;ancien domaine admin. Sa fusion
              dans le dashboard est prévue prochainement — sans changement
              fonctionnel pour toi.
            </p>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-[color:var(--color-grenat)] px-3.5 py-2 text-xs font-semibold text-[color:var(--color-bone)] transition-colors hover:bg-[color:var(--color-grenat-glow)]"
            >
              Ouvrir l&apos;interface images
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-neutral-800/60 bg-neutral-950/40 p-5 text-sm text-neutral-400">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Rappel — comment ça marche
        </p>
        <ul className="space-y-1.5 text-xs leading-relaxed">
          <li>— Sélectionne une page dans la sidebar puis une image.</li>
          <li>— Upload un nouveau fichier : il remplace le slot sélectionné.</li>
          <li>— Le site public se met à jour automatiquement sans redéploiement.</li>
        </ul>
      </div>
    </div>
  );
}
