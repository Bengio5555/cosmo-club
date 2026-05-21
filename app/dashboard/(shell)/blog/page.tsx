import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, STATUS_TONE, type ArticleStatus } from "./types";
import { GenerateAllCoversButton } from "./GenerateAllCoversButton";

export default async function BlogAdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, description, status, publish_at, cover_url, updated_at")
    .order("publish_at", { ascending: false });

  const missingCovers = (data ?? []).filter((a) => !a.cover_url).length;

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white md:text-3xl">Le Mag</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
            Articles éditoriaux publiés sur cosmoclub.fr/blog. Brouillons, planifications et version GMB en un seul endroit.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Link
            href="/dashboard/blog/new"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-950 transition hover:bg-neutral-200"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </Link>
          <GenerateAllCoversButton missingCount={missingCovers} />
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
          {error.message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 dark:border-neutral-800 bg-slate-100 dark:bg-neutral-900/50 text-left text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500">
            <tr>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 hidden md:table-cell">Date de publication</th>
              <th className="px-4 py-3 hidden lg:table-cell">Maj</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-xs text-slate-500 dark:text-neutral-500">
                  Aucun article pour le moment. Crée le premier via "Nouvel article".
                </td>
              </tr>
            )}
            {(data ?? []).map((a) => (
              <tr key={a.id} className="text-slate-700 dark:text-neutral-200">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/blog/${a.id}`}
                    className="block hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="font-medium">{a.title}</div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-neutral-500">
                      /blog/{a.slug}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[a.status as ArticleStatus]}`}>
                    {STATUS_LABEL[a.status as ArticleStatus]}
                  </span>
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500 dark:text-neutral-400">
                  {new Date(a.publish_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500 dark:text-neutral-500">
                  {new Date(a.updated_at).toLocaleDateString("fr-FR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
