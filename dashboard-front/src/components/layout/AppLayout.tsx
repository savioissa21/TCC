import { Outlet } from "react-router-dom"; // Se estiver usando router
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navegação */}
      <Sidebar />
      <MobileNav />

      {/* Conteúdo Principal */}
      {/* md:pl-64 empurra o conteúdo pra direita no desktop pra não ficar embaixo da sidebar */}
      <main className="md:pl-64 transition-all duration-300">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {/* Outlet renderiza as páginas filhas (Dashboard, Reviews, etc) */}
          <Outlet /> 
        </div>
      </main>
    </div>
  );
}