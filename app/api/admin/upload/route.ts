import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const STORAGE_BUCKET = "cosmoclub-images";

export async function POST(request: NextRequest) {
  try {
    const adminPassword = request.headers.get("x-admin-password");
    const expectedPassword = process.env.ADMIN_PASSWORD || "admin2024";

    if (adminPassword !== expectedPassword) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const imagePath = formData.get("imagePath") as string;
    const title = formData.get("title") as string;
    const section = formData.get("section") as string;
    const orientation = (formData.get("orientation") as string) || "landscape";
    const targetPage = formData.get("targetPage") as string | null;
    const targetKey = formData.get("targetKey") as string | null;

    if (!file || !imagePath) {
      return NextResponse.json(
        { error: "File and imagePath are required" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are allowed" },
        { status: 400 },
      );
    }

    // Build filename. Same convention as before — `{page}__{key}__{slug}.ext`
    // routes the upload to a specific slot in images-config; bare names
    // land in the events gallery.
    const ext = file.name.split(".").pop() || "png";
    const timestamp = Date.now();
    const slug = imagePath.split("/").pop()?.replace(/\.[^.]+$/, "") || "image";
    const base = `${slug}-${timestamp}.${ext}`;
    const rawFilename =
      targetPage && targetKey ? `${targetPage}__${targetKey}__${base}` : base;
    const filename = rawFilename.replace(/[^a-zA-Z0-9._\-]/g, "-");

    const supabase = createAdminClient();
    const buffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json(
        {
          error: "Storage upload failed",
          details: uploadError.message,
        },
        { status: 500 },
      );
    }

    const { data: pub } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      data: {
        url: pub.publicUrl,
        filename,
        title: title || file.name.replace(/\.[^.]+$/, ""),
        section: section || "Custom",
        orientation,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
