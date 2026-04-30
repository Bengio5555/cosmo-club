import {
  getAllEventTiles,
  getHomeGallerySelectionSet,
} from "@/lib/server/homeGallery";
import { GalleryPicker } from "./GalleryPicker";

export default async function HomeGalleryPage() {
  const [tiles, selected] = await Promise.all([
    getAllEventTiles(),
    getHomeGallerySelectionSet(),
  ]);

  // Server-resolved tiles get marked with a `selected` flag and a
  // position rank so the picker can render the order indicator
  // without re-querying.
  const supabaseRows = await getOrderedSelection();
  const orderRank = new Map<string, number>();
  supabaseRows.forEach((key, i) => orderRank.set(key, i + 1));

  const decorated = tiles.map((t) => ({
    ...t,
    selected: selected.has(t.key),
    rank: orderRank.get(t.key) ?? null,
  }));

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Galerie home
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Choisis jusqu&apos;à 8 photos affichées dans la galerie « Des
          nuits inoubliables » sur la page d&apos;accueil. Les autres
          restent visibles sur{" "}
          <a
            href="/evenements"
            className="text-neutral-200 underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            /evenements
          </a>
          .
        </p>
        <p className="mt-2 text-xs text-neutral-500">
          {selected.size} / 8 sélectionnées · {tiles.length} disponibles
        </p>
      </header>

      <GalleryPicker tiles={decorated} />
    </div>
  );
}

async function getOrderedSelection(): Promise<string[]> {
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data } = await supabase
    .from("homepage_gallery_selection")
    .select("image_key")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => r.image_key);
}
