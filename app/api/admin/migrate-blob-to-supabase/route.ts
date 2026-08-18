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
  if (!process.env.ADMIN_PASSWORD || adminPassword !== process.env.ADMIN_PASSWORD) {
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

    // 2. Pull the largest cached variant we can find. Direct calls to
    //    the proxy now 403 (Vercel Blob quota), but variants that were
    //    prewarmed earlier still serve from Vercel's CDN. Try the
    //    Next.js deviceSizes from largest to smallest — first hit wins.
    const encodedBlobUrl = Buffer.from(blob.url).toString("base64");
    const proxyPath = `/api/admin/image-proxy?url=${encodedBlobUrl}`;
    const widths = [3840, 2048, 1920, 1200, 1080, 828, 750, 640, 384, 256];

    let bytes: ArrayBuffer | null = null;
    let contentType = "image/avif";
    let recoveredWidth: number | null = null;
    let lastError = "";
    for (const w of widths) {
      const optimizedUrl = `${origin}/_next/image?url=${encodeURIComponent(
        proxyPath,
      )}&w=${w}&q=75`;
      try {
        const resp = await fetch(optimizedUrl, {
          headers: { Accept: "image/avif,image/webp,*/*" },
        });
        if (!resp.ok) {
          lastError = `${resp.status} ${resp.statusText}`;
          continue;
        }
        bytes = await resp.arrayBuffer();
        contentType = resp.headers.get("content-type") || contentType;
        recoveredWidth = w;
        break;
      } catch (err) {
        lastError = String(err);
      }
    }

    if (!bytes) {
      results.push({
        pathname: blob.pathname,
        status: "fetch_failed",
        detail: `no cached variant — last error: ${lastError}`,
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
      detail: `recovered at w=${recoveredWidth}`,
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
