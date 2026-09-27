import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(226,232,240,0.72),_transparent_32rem)] bg-slate-50">
      <Sidebar />
      <MobileNav />

      <main className="md:pl-64">
        <div className="container mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
