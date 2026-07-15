import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { Typography } from "../ui/typography";
import { Button } from "../ui/button";
import { NavItem } from "./NavItem";
import { Menu, X, Sparkles, LayoutDashboard, Store, Star, Settings, LogOut } from "lucide-react";
import { Avatar } from "../ui/avatar";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

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
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <X /> : <Menu />}
      </Button>

      {/* Drawer (Menu Aberto) */}
      {isOpen && (
        <div className="absolute left-0 top-16 h-[calc(100vh-4rem)] w-full bg-white p-4 dark:bg-slate-950 animate-in slide-in-from-top-5">
            <nav className="space-y-2">
                <NavItem icon={LayoutDashboard} label="Dashboard" isActive onClick={() => setIsOpen(false)} />
                <NavItem icon={Store} label="Minhas Lojas" onClick={() => setIsOpen(false)} />
                <NavItem icon={Star} label="Avaliações" onClick={() => setIsOpen(false)} />
                <NavItem icon={Settings} label="Configurações" onClick={() => setIsOpen(false)} />
            </nav>

            <div className="absolute bottom-4 left-4 right-4 border-t pt-4">
                 <div className="flex items-center gap-3 mb-4">
                    <Avatar fallback={user?.name || "US"} />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{user?.name}</span>
                        <span className="text-xs text-slate-500">{user?.email}</span>
                    </div>
                </div>
                <Button variant="destructive" className="w-full" onClick={signOut}>
                    <LogOut size={16} className="mr-2"/> Sair
                </Button>
            </div>
        </div>
      )}
    </header>
  );
}