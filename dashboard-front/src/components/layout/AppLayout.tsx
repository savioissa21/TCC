import { Outlet } from "react-router-dom";
import { MobileNav } from "./MobileNav";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="app-canvas relative min-h-screen overflow-x-hidden">
      <Sidebar />
      <MobileNav />

      <main id="main-content" className="relative z-10 md:pl-72">
        <div className="mx-auto w-full max-w-[90rem] px-4 py-5 sm:px-6 sm:py-7 md:px-8 md:py-9 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
