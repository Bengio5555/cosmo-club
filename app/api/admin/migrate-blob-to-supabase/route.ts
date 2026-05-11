import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";
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
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobToken) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN missing" },
      { status: 500 },
    );
  }

  // 1. List every blob still in the Vercel store. We can't talk to the
  //    proxy via /api/images-full anymore (that route now reads from
  //    Supabase) — but the SDK's list() works directly against the
  //    blob API and is what the legacy /api/images-full used to call.
  type BlobEntry = {
    url: string;
    pathname: string;
    uploadedAt?: Date | string;
  };
  let blobs: BlobEntry[];
  try {
    const result = await list({
      prefix: "cosmo-club/images/",
      token: blobToken,
    });
    blobs = result.blobs ?? [];
  } catch (err) {
    return NextResponse.json(
      { error: "Vercel Blob list failed", details: String(err) },
      { status: 500 },
    );
  }

  type Result = {
    pathname: string;
    filename?: string;
    publicUrl?: string;
    status: "ok" | "fetch_failed" | "upload_failed";
    detail?: string;
  };
  const results: Result[] = [];

  for (const blob of blobs) {
    const rawFilename = blob.pathname.split("/").pop() || "image.bin";

    // Sanitize: Supabase Storage doesn't love spaces, parentheses, etc.
    let filename = rawFilename.replace(/[^a-zA-Z0-9._\-]/g, "-");

    // 2. Pull the optimized variant from Vercel's image pipeline. The
    //    proxy still resolves blob URLs server-side, and the optimizer
    //    streams the result through Vercel's CDN — this is the path
    //    that's confirmed to still work even with the quota at 100%.
    const encodedBlobUrl = Buffer.from(blob.url).toString("base64");
    const proxyPath = `/api/admin/image-proxy?url=${encodedBlobUrl}`;
    const optimizedUrl = `${origin}/_next/image?url=${encodeURIComponent(
      proxyPath,
    )}&w=3840&q=80`;

    let bytes: ArrayBuffer;
    let contentType = "image/avif";
    try {
      const resp = await fetch(optimizedUrl, {
        headers: { Accept: "image/avif,image/webp,*/*" },
      });
      if (!resp.ok) {
        results.push({
          pathname: blob.pathname,
          status: "fetch_failed",
          detail: `${resp.status} ${resp.statusText}`,
        });
        continue;
      }
      bytes = await resp.arrayBuffer();
      contentType = resp.headers.get("content-type") || contentType;
    } catch (err) {
      results.push({
        pathname: blob.pathname,
        status: "fetch_failed",
        detail: String(err),
      });
      continue;
    }

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
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, bytes, {
        contentType,
        upsert: true,
      });
    if (upErr) {
      results.push({
        pathname: blob.pathname,
        filename,
        status: "upload_failed",
        detail: upErr.message,
      });
      continue;
    }

    const { data: pub } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filename);
    results.push({
      pathname: blob.pathname,
      filename,
      publicUrl: pub.publicUrl,
      status: "ok",
    });
  }

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter(
    (r) => r.status === "fetch_failed" || r.status === "upload_failed",
  ).length;

  return NextResponse.json({
    summary: { ok, failed, total: results.length },
    results,
  });
}
