import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — migrations can be slow

const BUCKET = "cosmoclub-images";

/**
 * One-shot migration: drains every Vercel Blob-backed image referenced
 * in /api/images-full and re-uploads it to the public Supabase Storage
 * bucket. Each blob is pulled through /_next/image (which goes via the
 * already-warm CDN cache when possible) so we don't have to talk to the
 * paused blob store directly. Idempotent — re-running just overwrites.
 *
 * POST with header `x-admin-password: <ADMIN_PASSWORD>` to trigger.
 */
export async function POST(request: NextRequest) {
  const adminPassword = request.headers.get("x-admin-password");
  if (adminPassword !== (process.env.ADMIN_PASSWORD || "admin2024")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const supabase = createAdminClient();

  // 1. Read the current image config (blob-backed URLs are exposed as
  //    /api/admin/image-proxy?url=<base64> entries).
  let config: { pages: Record<string, Record<string, { path?: string }>> };
  try {
    const r = await fetch(`${origin}/api/images-full`, {
      cache: "no-store",
    });
    config = await r.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read images-full", details: String(err) },
      { status: 500 },
    );
  }

  type Result = {
    page: string;
    key: string;
    filename?: string;
    publicUrl?: string;
    status: "ok" | "skip" | "fetch_failed" | "upload_failed";
    detail?: string;
  };
  const results: Result[] = [];

  for (const [page, slots] of Object.entries(config.pages ?? {})) {
    for (const [key, slot] of Object.entries(slots)) {
      const path = slot.path;
      if (!path || !path.startsWith("/api/admin/image-proxy")) {
        results.push({ page, key, status: "skip", detail: "not blob-backed" });
        continue;
      }

      // Decode the blob URL out of the proxy URL so we can derive a
      // sensible filename for the Supabase object.
      let filename = `${page}__${key}.bin`;
      try {
        const u = new URL(`http://x${path}`);
        const b64 = u.searchParams.get("url");
        if (b64) {
          const blobUrl = Buffer.from(b64, "base64").toString("utf-8");
          const tail = blobUrl.split("/").pop();
          if (tail) filename = decodeURIComponent(tail);
        }
      } catch {
        /* keep fallback */
      }

      // Sanitize: replace any character Supabase Storage doesn't love.
      filename = filename.replace(/[^a-zA-Z0-9._\-]/g, "-");

      // 2. Pull the optimized variant from Vercel's image pipeline. The
      //    largest variant (w=3840) gives us the best quality we can
      //    still recover.
      const optimizedUrl = `${origin}/_next/image?url=${encodeURIComponent(
        path,
      )}&w=3840&q=80`;
      let bytes: ArrayBuffer;
      let contentType = "image/avif";
      try {
        const resp = await fetch(optimizedUrl, {
          headers: { Accept: "image/avif,image/webp,*/*" },
        });
        if (!resp.ok) {
          results.push({
            page,
            key,
            status: "fetch_failed",
            detail: `${resp.status} ${resp.statusText}`,
          });
          continue;
        }
        bytes = await resp.arrayBuffer();
        contentType = resp.headers.get("content-type") || contentType;
      } catch (err) {
        results.push({
          page,
          key,
          status: "fetch_failed",
          detail: String(err),
        });
        continue;
      }

      // Use the content-type to pick a sensible extension if the
      // recovered file ends up as AVIF/WebP (highly likely).
      const extFromCt: Record<string, string> = {
        "image/avif": "avif",
        "image/webp": "webp",
        "image/jpeg": "jpg",
        "image/png": "png",
      };
      const ext = extFromCt[contentType] || "bin";
      filename = filename.replace(/\.(jpg|jpeg|png|webp|avif)$/i, `.${ext}`);
      if (!/\.[a-z0-9]+$/i.test(filename)) filename += `.${ext}`;

      // 3. Upload to Supabase Storage. `upsert` lets us re-run safely.
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, bytes, {
          contentType,
          upsert: true,
        });
      if (error) {
        results.push({
          page,
          key,
          filename,
          status: "upload_failed",
          detail: error.message,
        });
        continue;
      }

      const { data: pub } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filename);
      results.push({
        page,
        key,
        filename,
        publicUrl: pub.publicUrl,
        status: "ok",
      });
    }
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter(
    (r) => r.status === "fetch_failed" || r.status === "upload_failed",
  ).length;
  const skipped = results.filter((r) => r.status === "skip").length;

  return NextResponse.json({
    summary: { ok, failed, skipped, total: results.length },
    results,
  });
}
