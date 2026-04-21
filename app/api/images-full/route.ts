import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { list } from "@vercel/blob";

/**
 * API endpoint that returns complete images config
 * Merges images-config.json + images from Vercel Blob storage
 */
export async function GET(request: NextRequest) {
  try {
    // Load static config
    const configPath = join(process.cwd(), "public", "images-config.json");
    const configContent = await readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);

    // Load images from Vercel Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(config);
    }

    try {
      const blobs = await list({
        prefix: "cosmo-club/images/",
        token: blobToken,
      });

      // Route blob images into config pages. Blobs whose filename starts
      // with `{page}__{key}__` are routed to that specific slot (override).
      // Unprefixed blobs fall back to the evenements gallery.
      if (blobs.blobs && blobs.blobs.length > 0) {
        if (!config.pages.evenements) {
          config.pages.evenements = {};
        }

        blobs.blobs.forEach((blob) => {
          const filename = blob.pathname.split("/").pop() || "";
          const encodedUrl = Buffer.from(blob.url).toString("base64");
          const proxyUrl = `/api/admin/image-proxy?url=${encodedUrl}`;

          // Check for routing prefix: `{page}__{key}__...`
          const prefixMatch = filename.match(/^([^_]+)__([^_]+)__(.+)$/);
          if (prefixMatch) {
            const [, page, key] = prefixMatch;
            if (!config.pages[page]) config.pages[page] = {};
            // Override: newest blob wins for this slot (list() is roughly
            // lexicographic; replacement uploads have a newer timestamp
            // which sorts last, so this is fine in practice).
            const existing = config.pages[page][key] || {};
            config.pages[page][key] = {
              ...existing,
              path: proxyUrl,
            };
            return;
          }

          // Unprefixed → evenements gallery (legacy behavior)
          const key = filename
            .replace(/\.[^.]+$/, "")
            .replace(/\W+/g, "-")
            .toLowerCase();
          if (!config.pages.evenements[key]) {
            config.pages.evenements[key] = {
              title: filename.replace(/\.[^.]+$/, ""),
              path: proxyUrl,
              orientation: "portrait",
              section: "Galerie Événements",
              label: "Événement",
            };
          }
        });
      }
    } catch (blobErr) {
      console.log("Blob list failed, returning static config only");
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Images config error:", error);
    return NextResponse.json(
      { error: "Failed to load images config" },
      { status: 500 }
    );
  }
}
