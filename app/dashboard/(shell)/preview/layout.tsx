import { PreviewShell } from "./PreviewShell";

/**
 * Layout des pages preview : délègue à PreviewShell (client) la
 * gestion du thème (light/dark toggle + persistance localStorage) et
 * le sub-nav entre les démos. Le layout reste server pour que les
 * pages enfants puissent fetcher Supabase normalement.
 */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PreviewShell>{children}</PreviewShell>;
}
