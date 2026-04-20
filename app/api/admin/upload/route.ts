import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

interface ImageConfig {
  title: string;
  path: string;
  orientation: "portrait" | "landscape" | "square";
  section: string;
}

interface Config {
  pages: Record<string, Record<string, ImageConfig>>;
}

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
    const page = formData.get("page") as string;

    if (!file || !page) {
      return NextResponse.json(
        { error: "File and page are required" },
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

    // Generate filename
    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "png";
    const filename = `${page}-${timestamp}.${ext}`;
    const filepath = path.join(process.cwd(), "public", "brand", "ai", filename);

    // Save file
    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

    // Update config
    const configPath = path.join(process.cwd(), "public", "images-config.json");
    let config: Config;

    try {
      const data = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(data);
    } catch {
      config = { pages: { [page]: {} } };
    }

    // Ensure page exists
    if (!config.pages[page]) {
      config.pages[page] = {};
    }

    // Add image to config
    const key = `${page}-${timestamp}`;
    config.pages[page][key] = {
      title: file.name.replace(/\.[^.]+$/, ""), // Remove extension
      path: `/brand/ai/${filename}`,
      orientation: "landscape", // Default orientation
      section: page.charAt(0).toUpperCase() + page.slice(1),
    };

    // Save updated config
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    return NextResponse.json({
      success: true,
      filename,
      key,
      message: "Image uploadée avec succès",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
