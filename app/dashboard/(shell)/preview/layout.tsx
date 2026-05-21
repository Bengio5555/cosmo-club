import { PreviewNav } from "./PreviewNav";

/**
 * Layout des pages preview : applique un fond clair (slate-50) sur
 * tout le contenu, et place une sub-nav en haut pour basculer entre
 * les démos (Tableau de bord / Clients / Calendrier).
 */
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-slate-50">
      <PreviewNav />
      {children}
    </div>
  );
}
