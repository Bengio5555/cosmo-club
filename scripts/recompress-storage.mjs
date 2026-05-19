#!/usr/bin/env node
/**
 * One-shot re-compression of heavy images already living in Supabase
 * Storage. Re-encodes anything over 200 KB to WebP (quality 78) and
 * caps the longest side at 1600 px. Keeps the original filename so all
 * existing URLs (article.cover_url, image_overrides, client_logos)
 * keep resolving — only the contentType and bytes change.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/recompress-storage.mjs
 *
 * Idempotent: re-running it on already-optimized files is harmless
 * (sharp re-encodes WebP to WebP, weight stays roughly the same).
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = "https://rqqjndxxjpsdkbtqikyn.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY env var required.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const BUCKETS = ["cosmoclub-images", "cosmoclub-articles", "cosmoclub-logos"];
const MIN_SIZE_BYTES = 200 * 1024; // 200 KB threshold
const MAX_DIMENSION = 1600;
const WEBP_QUALITY = 78;
const CACHE_CONTROL = "31536000"; // 1 year

// Walks every object in a bucket (paginated). The .list() API returns
// up to 1000 entries per call with sortBy + range. We bump the limit
// to 1000 and don't paginate further — none of our buckets exceed
// that yet. Adjust if you cross 1k objects per bucket.
async function listAll(bucket) {
  const { data, error } = await supabase.storage.from(bucket).list("", {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`list ${bucket}: ${error.message}`);
  const out = [];
  for (const entry of data ?? []) {
    if (!entry.name || entry.name === ".emptyFolderPlaceholder") continue;
    // .list() at root returns folders too — recurse one level deep so
    // we catch /article-slug/cover-*.png style paths.
    const looksLikeFolder = !entry.metadata;
    if (looksLikeFolder) {
      const { data: sub } = await supabase.storage.from(bucket).list(entry.name, {
        limit: 1000,
      });
      for (const child of sub ?? []) {
        if (!child.name) continue;
        out.push({ path: `${entry.name}/${child.name}`, meta: child.metadata });
      }
    } else {
      out.push({ path: entry.name, meta: entry.metadata });
    }
  }
  return out;
}

async function recompressBucket(bucket) {
  console.log(`\n=== ${bucket} ===`);
  const objects = await listAll(bucket);
  const heavy = objects.filter((o) => {
    const size = Number(o.meta?.size ?? 0);
    const mime = String(o.meta?.mimetype ?? "");
    return size > MIN_SIZE_BYTES && mime.startsWith("image/") && !mime.includes("svg");
  });
  console.log(`  ${heavy.length} heavy image(s) to process (>${MIN_SIZE_BYTES / 1024} KB).`);

  let totalSaved = 0;
  let ok = 0;
  let failed = 0;

  for (const obj of heavy) {
    process.stdout.write(`  · ${obj.path} (${(Number(obj.meta.size) / 1024).toFixed(0)} KB) → `);
    try {
      const { data: blob, error: dlErr } = await supabase.storage
        .from(bucket)
        .download(obj.path);
      if (dlErr) throw dlErr;
      const inBuf = Buffer.from(await blob.arrayBuffer());

      const outBuf = await sharp(inBuf, { failOn: "none" })
        .resize({
          width: MAX_DIMENSION,
          height: MAX_DIMENSION,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toBuffer();

      if (outBuf.length >= inBuf.length) {
        process.stdout.write(`already optimal, skipping\n`);
        continue;
      }

      const { error: upErr } = await supabase.storage.from(bucket).upload(obj.path, outBuf, {
        upsert: true,
        contentType: "image/webp",
        cacheControl: CACHE_CONTROL,
      });
      if (upErr) throw upErr;

      const saved = inBuf.length - outBuf.length;
      totalSaved += saved;
      ok += 1;
      process.stdout.write(
        `${(outBuf.length / 1024).toFixed(0)} KB (saved ${(saved / 1024).toFixed(0)} KB)\n`,
      );
    } catch (err) {
      failed += 1;
      process.stdout.write(`FAIL — ${err.message}\n`);
    }
  }

  console.log(
    `  Done: ${ok} ok, ${failed} failed, ${(totalSaved / 1024 / 1024).toFixed(1)} MB saved.`,
  );
  return { ok, failed, saved: totalSaved };
}

async function main() {
  console.log("Re-compressing Supabase Storage buckets to WebP…");
  let totalSaved = 0;
  for (const b of BUCKETS) {
    const r = await recompressBucket(b);
    totalSaved += r.saved;
  }
  console.log(
    `\n✓ All buckets done — total saved: ${(totalSaved / 1024 / 1024).toFixed(1)} MB.`,
  );
  console.log("Reminder: existing URLs still resolve (same filename, just WebP bytes now).");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
