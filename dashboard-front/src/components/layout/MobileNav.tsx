import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Typography } from "../ui/typography";
import { Button } from "../ui/button";
import { Menu, X, Sparkles, LayoutDashboard, Store, LogOut } from "lucide-react";
import { Avatar } from "../ui/avatar";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="md:hidden flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-950 sticky top-0 z-50">
      
      {/* Logo Mobile */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-white">
            <Sparkles size={14} />
        </div>
        <Typography variant="h4">NEXO</Typography>
      </div>

      {/* Botão Hamburger */}
      <Button variant="ghost" size="icon" aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen} aria-controls="mobile-menu" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Drawer (Menu Aberto) */}
      {isOpen && (
        <div id="mobile-menu" className="absolute left-0 top-16 min-h-[calc(100dvh-4rem)] w-full bg-white p-4 dark:bg-slate-950 animate-in slide-in-from-top-5"
          onKeyDown={event => { if (event.key === "Escape") setIsOpen(false); }}>
            <nav aria-label="Menu principal móvel" className="space-y-2">
                {[{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
                  { to: "/minhas-lojas", label: "Minhas Lojas", icon: Store }].map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} onClick={() => setIsOpen(false)}
                      className={({ isActive }) => `flex items-center gap-3 rounded-lg p-3 ${isActive ? "bg-slate-900 text-white" : "text-slate-700"}`}>
                      <Icon size={18} />{label}
                    </NavLink>
                  ))}
            </nav>

            <div className="absolute bottom-4 left-4 right-4 border-t pt-4">
                 <div className="flex items-center gap-3 mb-4">
                    <Avatar fallback={user?.name || "US"} />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user?.name}</span>
                        <span className="text-xs text-slate-500">{user?.email}</span>
                    </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={() => { signOut(); setIsOpen(false); navigate("/login", { replace: true }); }}>
                    <LogOut size={16} className="mr-2"/> Sair
                </Button>
            </div>
        </div>
      )}
    </header>
  );
}
