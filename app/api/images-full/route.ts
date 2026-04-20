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

      // Add blob images to appropriate sections
      if (blobs.blobs && blobs.blobs.length > 0) {
        // Initialize evenements if needed
        if (!config.pages.evenements) {
          config.pages.evenements = {};
        }

        blobs.blobs.forEach((blob) => {
          const filename = blob.pathname.split("/").pop() || "";
          const key = filename.replace(/\.[^.]+$/, "").replace(/\W+/g, "-").toLowerCase();

          // Add to evenements section
          if (!config.pages.evenements[key]) {
            // Use the blob URL directly with auth header (will be handled by proxy)
            // The proxy will fetch it with the blob token
            const proxyUrl = `/api/admin/image-proxy?url=${Buffer.from(blob.url).toString('base64')}`;
            config.pages.evenements[key] = {
              title: filename.replace(/\.[^.]+$/, ""),
              path: proxyUrl,
              orientation: "portrait",
              section: "Galerie Événements"
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
