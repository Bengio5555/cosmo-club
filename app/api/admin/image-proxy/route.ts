import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy endpoint to serve images from private Vercel Blob storage
 * Usage: /api/admin/image-proxy?url=<blob-url>
 */
export async function GET(request: NextRequest) {
  try {
    let url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // Decode if it's base64 encoded
    try {
      url = Buffer.from(url, 'base64').toString('utf-8');
    } catch {
      // If decoding fails, use the URL as-is (it might be a regular URL)
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN not set");
      return NextResponse.json(
        { error: "Blob token not configured" },
        { status: 500 }
      );
    }

    console.log("Proxying image:", { url: url.substring(0, 50) + "..." });

    // Fetch the blob directly with auth header
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${blobToken}`,
      },
    });

    if (!response.ok) {
      console.error("Blob fetch failed:", response.status, response.statusText);
      return NextResponse.json(
        {
          error: "Failed to fetch from Blob",
          details: `${response.status} ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    // Get the response buffer
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/png";

    // Cache-Control: source URLs are content-addressed (blob hash in the
    // URL), so re-uploads create new URLs — safe to mark immutable for
    // 1 year. Lets Vercel's CDN absorb all subsequent reads after the
    // first cold start instead of hitting this serverless function on
    // every request.
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
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
