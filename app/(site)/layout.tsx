import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { CustomCursor } from "@/components/cursor/CustomCursor";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    // `site-chrome` enables the editorial custom cursor (scoped via
    // globals.css) — the /dashboard tree intentionally lacks it so the
    // native cursor stays visible there.
    <div className="site-chrome">
      <SmoothScroll />
      <CustomCursor />
      <div className="grain" aria-hidden />
      <Header />
      <main className="relative">{children}</main>
      <Footer />
    </div>
  );
}
