import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileNav } from "@/components/dashboard/MobileNav";
import { ThemeProvider } from "@/components/dashboard/ThemeProvider";
import type { UserRole } from "@/lib/auth/roles";

// PWA-friendly metadata scoped to the dashboard. When users "Add to
// Home Screen" on iOS/Android, they get a standalone-mode app with the
// dark slate Zenith chrome — distinct from the cream public site.
export const metadata: Metadata = {
  title: {
    default: "Cosmo Admin",
    template: "%s · Cosmo Admin",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cosmo Admin",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

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
      <div className="dashboard-shell flex min-h-[100dvh] bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200">
        <Sidebar role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={user.email ?? null} />
          <main className="flex-1 overflow-x-hidden pb-[max(env(safe-area-inset-bottom),0.5rem)] md:pb-0">
            {children}
          </main>
          <MobileNav role={role} />
        </div>
      </div>
    </ThemeProvider>
  );
}
