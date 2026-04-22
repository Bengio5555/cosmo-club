import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { computeCoursesData, type CoursesMode } from "@/app/dashboard/(shell)/events/[id]/courses/computeCoursesData";
import { CoursesPdf } from "@/app/dashboard/(shell)/events/[id]/courses/CoursesPdf";

// Force Node runtime — @react-pdf/renderer ships CJS + native pdfkit
// internals that don't run on the Edge runtime.
export const runtime = "nodejs";

/**
 * Server-generated PDF of the event shopping list. Streams the buffer
 * with a `Content-Disposition: attachment` so the browser triggers a
 * real download instead of an inline view.
 *
 * Supports the same `mode=shortage|full` query param as the HTML page
 * so the two stay aligned.
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const mode: CoursesMode =
    url.searchParams.get("mode") === "full" ? "full" : "shortage";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const data = await computeCoursesData(supabase, id, mode);
  if (!data) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(<CoursesPdf data={data} />);

  const safeTitle = data.event.title
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "event";
  const datePart = data.event.date ? data.event.date.replace(/-/g, "") : "";
  const filename = `liste-courses_${safeTitle}${datePart ? `_${datePart}` : ""}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
