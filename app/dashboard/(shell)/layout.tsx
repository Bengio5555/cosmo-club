import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";

/**
 * Shell layout: sidebar + topbar. Applied to every authenticated dashboard
 * page via the (shell) route group. The /dashboard/login and
 * /dashboard/auth/callback routes are sibling to this group, so they render
 * without the chrome.
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

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-200">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={user.email ?? null} />
          <main className="flex-1 overflow-x-hidden">{children}</main>
          <MobileNav />
        </div>
      </div>
    </ThemeProvider>
  );
}
