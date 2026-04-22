import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetch the active catalog items for the dashboard picker.
 * Gated by the same Supabase session as the rest of /dashboard (the
 * proxy.ts redirects unauthenticated requests before they reach this
 * handler, and RLS on catalog_items limits reads to authenticated anyway).
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("archived", false)
    .order("section", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}
