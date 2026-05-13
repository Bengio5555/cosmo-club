import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";
import type { UserRole } from "@/lib/auth/roles";

/**
 * Shell layout: sidebar + topbar. Applied to every authenticated dashboard
 * page via the (shell) route group. The /dashboard/login and
 * /dashboard/auth/callback routes are sibling to this group, so they render
 * without the chrome.
 *
 * Role-based access control is enforced upstream in proxy.ts. This layout
 * just fetches the role to feed the sidebar so forbidden items are hidden.
 */
export default async function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already redirects, this is a belt-and-suspenders check.
  if (!user) {
    redirect("/dashboard/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (profile?.role as UserRole | undefined) ?? "staff";

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-200">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={user.email ?? null} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <MobileNav role={role} />
        </div>
      </div>
    </ThemeProvider>
  );
}
