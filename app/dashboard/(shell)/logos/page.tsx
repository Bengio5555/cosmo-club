import { createClient } from "@/lib/supabase/server";
import { LogosManager } from "./LogosManager";

export default async function LogosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_logos")
    .select("*")
    .eq("archived", false)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  // Convert each blob URL into the proxy URL once, server-side.
  const logos = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    proxyUrl: `/api/admin/image-proxy?url=${Buffer.from(row.blob_url).toString("base64")}`,
  }));

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-white md:text-3xl">
          Logos clients
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Logos affichés dans la bande défilante « Ils nous ont fait
          confiance » sur la page d&apos;accueil. Tous les logos sont
          rendus à la même hauteur (48 px) pour un rendu harmonieux —
          peu importe les proportions de l&apos;image source.
        </p>
      </header>

      <LogosManager logos={logos} />
    </div>
  );
}
