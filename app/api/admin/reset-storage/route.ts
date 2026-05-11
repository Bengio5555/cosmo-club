import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "cosmoclub-images";

/**
 * One-shot helper: drops every object in the cosmoclub-images bucket
 * so the owner can re-upload from scratch via /dashboard/images.
 * Direct DELETE on storage.objects is blocked by Supabase, so this
 * has to walk the bucket through the Storage API.
 *
 * POST with `x-admin-password: <ADMIN_PASSWORD>`.
 */
export async function POST(request: NextRequest) {
  const adminPassword = request.headers.get("x-admin-password");
  if (adminPassword !== (process.env.ADMIN_PASSWORD || "admin2024")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list("", { limit: 1000 });
  if (listErr) {
    return NextResponse.json(
      { error: "list failed", details: listErr.message },
      { status: 500 },
    );
  }
  const names = (files ?? [])
    .map((f) => f.name)
    .filter((n) => n && n !== ".emptyFolderPlaceholder");
  if (names.length === 0) {
    return NextResponse.json({ deleted: 0, message: "already empty" });
  }
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(names);
  if (delErr) {
    return NextResponse.json(
      { error: "remove failed", details: delErr.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ deleted: names.length, names });
}
