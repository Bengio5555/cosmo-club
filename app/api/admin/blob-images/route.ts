import { NextRequest, NextResponse } from "next/server";
import { list } from "@vercel/blob";

export async function GET(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password");
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (!expectedPassword || adminPassword !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "Blob token not configured" },
        { status: 500 }
      );
    }

    // List all images from Blob storage
    const blobs = await list({
      prefix: "cosmo-club/images/",
      token: blobToken,
    });

    // Transform blob list to image metadata
    const images = blobs.blobs.map((blob) => ({
      filename: blob.pathname.split("/").pop() || "",
      url: blob.url,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
    }));

    return NextResponse.json({
      success: true,
      images: images,
      total: images.length,
    });
  } catch (error) {
    console.error("Error listing blob images:", error);
    return NextResponse.json(
      {
        error: "Failed to list images",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
