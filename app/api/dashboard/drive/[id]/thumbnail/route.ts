import type { NextRequest } from "next/server";
import { hasDriveAccess } from "@/lib/drive/access";
import { DriveError, fetchThumbnail } from "@/lib/drive/api";

// The proxy only guards /dashboard pages, so this route checks the
// session and role itself before touching Drive.
export async function GET(
  req: NextRequest,
  ctx: RouteContext<"/api/dashboard/drive/[id]/thumbnail">,
) {
  if (!(await hasDriveAccess())) {
    return new Response("Accès refusé", { status: 401 });
  }
  const { id } = await ctx.params;
  const size = req.nextUrl.searchParams.get("s") === "1600" ? 1600 : 400;
  try {
    const upstream = await fetchThumbnail(id, size);
    // Only raster formats: never serve SVG/HTML from our origin.
    const type = upstream.headers.get("content-type")?.split(";")[0] ?? "";
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) {
      return new Response(null, { status: 502 });
    }
    return new Response(upstream.body, {
      headers: {
        "content-type": type,
        // Private: the bytes are only for signed-in team members.
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    const status = err instanceof DriveError ? err.status : 502;
    return new Response(null, { status });
  }
}
