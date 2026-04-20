import { readFile, writeFile } from "fs/promises";
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
  const adminPassword = process.env.ADMIN_PASSWORD || "admin2024";

  if (password !== adminPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await writeFile(CONFIG_PATH, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
