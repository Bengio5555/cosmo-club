import { NextRequest, NextResponse } from "next/server";
import { download } from "@vercel/blob";

/**
 * Proxy endpoint to serve images from private Vercel Blob storage
 * Usage: /api/admin/image-proxy?url=<blob-url>
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "Blob token not configured" },
        { status: 500 }
      );
    }

    // Download the blob
    const blob = await download(url, {
      token: blobToken,
    });

    // Return as image with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        "Content-Type": "image/png", // Adjust based on actual type
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
