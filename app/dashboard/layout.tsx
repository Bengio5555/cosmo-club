import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard · Cosmo Club",
  description: "Pilotage business Cosmo Club Paris",
  robots: { index: false, follow: false },
};

/**
 * Outer /dashboard layout: just the dark canvas and metadata.
 * Route-group layouts (./(shell)/layout.tsx) add the actual chrome so the
 * login and auth-callback pages can render without it.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100">
      {children}
    </div>
  );
}
