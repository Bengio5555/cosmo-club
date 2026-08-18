import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

const CONFIG_PATH = join(process.cwd(), "public/images-config.json");

export async function GET() {
  try {
    const config = await readFile(CONFIG_PATH, "utf-8");
    return NextResponse.json(JSON.parse(config));
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to read config" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const password = req.headers.get("x-admin-password");
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || password !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // On Vercel, filesystem is read-only, so we can't update images-config.json
  // Images are now stored in Vercel Blob instead
  return NextResponse.json({
    success: false,
    error: "Configuration changes are not persisted on Vercel (read-only filesystem)",
    message: "Uploaded images are stored in Vercel Blob. To delete images, use the image proxy.",
    note: "Static images in images-config.json cannot be modified. Only new uploads to Blob can be managed."
  }, { status: 400 });
}
