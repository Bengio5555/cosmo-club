import { hasDriveAccess } from "@/lib/drive/access";
import { DriveError, fetchContent } from "@/lib/drive/api";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/dashboard/drive/[id]/download">,
) {
  if (!(await hasDriveAccess())) {
    return new Response("Accès refusé", { status: 401 });
  }
  const { id } = await ctx.params;
  try {
    const { item, res } = await fetchContent(id);
    const headers = new Headers({
      // Always a download, never rendered inline on our origin.
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(item.name)}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    });
    const length = res.headers.get("content-length");
    if (length) headers.set("content-length", length);
    return new Response(res.body, { headers });
  } catch (err) {
    const status = err instanceof DriveError ? err.status : 502;
    const message = err instanceof DriveError ? err.message : "Téléchargement impossible.";
    return new Response(message, { status });
  }
}
