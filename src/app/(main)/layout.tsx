import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="pb-16 lg:pb-0 lg:pl-56">
        <div className="min-h-screen">{children}</div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
}
