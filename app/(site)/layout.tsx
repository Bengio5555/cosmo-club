import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SmoothScroll } from "@/components/motion/SmoothScroll";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <div className="grain" aria-hidden />
      <Header />
      <main className="relative">{children}</main>
      <Footer />
    </>
  );
}
