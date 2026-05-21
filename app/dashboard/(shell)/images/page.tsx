import { loadDashboardImagesConfig } from "./actions";
import { ImagesManager } from "./ImagesManager";

export default async function DashboardImagesPage() {
  const config = await loadDashboardImagesConfig();
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">
          Images du site
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
          Remplace les visuels publics — hero, bento, cocktails, lattes,
          galerie événements. Choisis une page, sélectionne un slot,
          puis dépose une nouvelle image.
        </p>
      </header>

      <ImagesManager initialConfig={config} />
    </div>
  );
}
