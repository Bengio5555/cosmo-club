import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const adminPassword = request.headers.get("x-admin-password");
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin2024";

    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const imagePath = formData.get("imagePath") as string;
    const title = formData.get("title") as string;
    const section = formData.get("section") as string;
    const orientation = formData.get("orientation") as string || "landscape";
    const targetPage = formData.get("targetPage") as string | null;
    const targetKey = formData.get("targetKey") as string | null;

    if (!file || !imagePath) {
      return NextResponse.json(
        { error: "File and imagePath are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 }
      );
    }

    // Build filename. If targetPage and targetKey are provided, prefix the
    // filename with `{page}__{key}__` so that readers (images-full + admin)
    // can route the blob to the right slot. We use "__" as the delimiter
    // since it does not appear in page/key slugs.
    const ext = file.name.split(".").pop() || "png";
    const timestamp = Date.now();
    const slug = imagePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
    const base = `${slug}-${timestamp}.${ext}`;
    const filename = targetPage && targetKey
      ? `${targetPage}__${targetKey}__${base}`
      : base;
    const blobPath = `cosmo-club/images/${filename}`;

    console.log("Starting upload:", { blobPath, fileSize: file.size, fileType: file.type });

    // Upload to Vercel Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    console.log("Token check:", { tokenExists: !!blobToken, tokenLength: blobToken?.length || 0 });

    if (!blobToken) {
      console.error("BLOB_READ_WRITE_TOKEN is not set in environment");
      return NextResponse.json(
        {
          error: "Blob storage not configured",
          tokenExists: false,
          details: "BLOB_READ_WRITE_TOKEN environment variable is missing"
        },
        { status: 500 }
      );
    }

    let blobUrl = "";
    try {
      console.log("Calling vercel blob put()...");
      const blob = await put(blobPath, file, {
        access: "private",
        token: blobToken,
      });
      console.log("Blob upload successful:", blob.url);
      blobUrl = blob.url;
    } catch (blobError) {
      console.error("Blob upload error details:", {
        error: blobError,
        message: blobError instanceof Error ? blobError.message : String(blobError),
        stack: blobError instanceof Error ? blobError.stack : undefined
      });
      return NextResponse.json(
        {
          error: "Blob storage upload failed",
          details: blobError instanceof Error ? blobError.message : String(blobError),
          tokenExists: true
        },
        { status: 500 }
      );
    }

    // Return success - Blob stores image, admin will fetch from list API
    return NextResponse.json({
      success: true,
      data: {
        url: blobUrl,
        filename: filename,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        section: section || "Custom",
        orientation: orientation,
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
