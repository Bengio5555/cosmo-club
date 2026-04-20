import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

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

    // Get file extension
    const ext = file.name.split(".").pop() || "png";
    const timestamp = Date.now();
    const filename = `${imagePath.split("/").pop()?.replace(/\.[^.]+$/, "")}-${timestamp}.${ext}`;
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

    // Update images-config.json
    try {
      const configPath = join(process.cwd(), "public", "images-config.json");
      const configContent = await readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);

      // Extract page and section from imagePath
      const pageMatch = imagePath.match(/\/(\w+)\//);
      const page = pageMatch ? pageMatch[1] : "custom";

      // Initialize page structure if needed
      if (!config.pages[page]) {
        config.pages[page] = {};
      }

      // Add or update image entry
      const imageKey = file.name.replace(/\.[^.]+$/, "");
      config.pages[page][imageKey] = {
        title: title || file.name.replace(/\.[^.]+$/, ""),
        path: `/brand/ai/${filename}`,
        orientation: orientation,
        section: section || "Custom",
        blobUrl: blobUrl
      };

      // Save updated config
      await writeFile(configPath, JSON.stringify(config, null, 2));
      console.log("Config updated successfully");

      return NextResponse.json({
        success: true,
        data: {
          url: blobUrl,
          path: `/brand/ai/${filename}`,
          title: title || file.name.replace(/\.[^.]+$/, ""),
          section: section || "Custom",
          orientation: orientation,
        }
      });
    } catch (configError) {
      console.error("Config update error:", configError);
      // Upload succeeded but config update failed
      return NextResponse.json({
        success: true,
        warning: "Image uploaded but config update failed",
        data: {
          url: blobUrl,
          configError: configError instanceof Error ? configError.message : String(configError)
        }
      });
    }
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
