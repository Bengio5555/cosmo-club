import { NextRequest, NextResponse } from "next/server";

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

    // Return success - file should be uploaded separately via GitHub/git
    return NextResponse.json({
      success: true,
      message: "Image registered - please upload file to /public/brand/ai/ directory",
      data: {
        path: imagePath,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        section: section || "Custom",
        orientation: orientation,
      }
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}
