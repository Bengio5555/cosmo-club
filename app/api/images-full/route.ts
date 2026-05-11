import { NextResponse } from "next/server";
import { getImagesConfig } from "@/lib/server/imagesConfig";

export const runtime = "nodejs";

/**
 * Thin wrapper around `getImagesConfig` so the client-side
 * `useImageConfig` hook gets the same config the server components
 * see (Supabase Storage + image_overrides). Single source of truth.
 */
export async function GET() {
  try {
    const config = await getImagesConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Images config error:", error);
    return NextResponse.json(
      { error: "Failed to load images config" },
      { status: 500 },
    );
  }
}
