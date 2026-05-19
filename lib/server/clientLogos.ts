import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicClientLogo = {
  id: string;
  name: string;
  url: string;
};

/**
 * Fetch the active client logos for the public marquee. Each blob URL
 * is wrapped in `/api/admin/image-proxy?url=BASE64` so the same
 * authenticated reader path that already exists for admin images
 * delivers them — no separate public access policy needed on the blob.
 */
export async function getPublicClientLogos(): Promise<PublicClientLogo[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("client_logos")
      .select("id,name,blob_url")
      .eq("archived", false)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.warn("[getPublicClientLogos]", error.message);
      return [];
    }
    // Skip the /api/admin/image-proxy hop and serve directly from
    // Supabase Storage. The proxy was a relic from the Vercel Blob
    // migration and forced every logo through a Next.js route handler,
    // which broke <Image> optimization and caching.
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      url: row.blob_url,
    }));
  } catch (err) {
    console.warn("[getPublicClientLogos] thrown:", err);
    return [];
  }
}
