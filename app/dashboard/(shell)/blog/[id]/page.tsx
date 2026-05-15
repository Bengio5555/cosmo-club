import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArticleEditor } from "../ArticleEditor";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <ArticleEditor initial={data} />
    </div>
  );
}
