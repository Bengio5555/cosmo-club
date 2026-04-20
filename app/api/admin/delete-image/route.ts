import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";

/**
 * Delete an image from Vercel Blob storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password");
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin2024";

    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter required" },
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

    // Delete from blob
    await del(url, { token: blobToken });

    return NextResponse.json({
      success: true,
      message: "Image deleted from storage"
    });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
