import { redirect } from "next/navigation";

/**
 * Legacy `/admin` lived as a standalone password-gated mini-app for
 * image upload. It's been folded into the dashboard at
 * /dashboard/images (same UI, same powers, dashboard-styled), so we
 * just redirect here to keep old links working.
 */
export default function LegacyAdminRedirect() {
  redirect("/dashboard/images");
}
