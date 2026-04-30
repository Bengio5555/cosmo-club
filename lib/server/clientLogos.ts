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
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      url: `/api/admin/image-proxy?url=${Buffer.from(row.blob_url).toString("base64")}`,
    }));
  } catch (err) {
    console.warn("[getPublicClientLogos] thrown:", err);
    return [];
  }
}
