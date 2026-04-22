import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Minimal client picker endpoint — returns only what's needed to fill a
 * dropdown (id + display label). Consumed by NewEventButton and any
 * future inline client selector.
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
    .from("clients")
    .select("id,first_name,last_name,company_name,email")
    .order("updated_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const clients = (data ?? []).map((c) => ({
    id: c.id,
    label:
      c.company_name ||
      [c.first_name, c.last_name].filter(Boolean).join(" ") ||
      c.email ||
      "— sans nom",
  }));
  return NextResponse.json({ clients });
}
