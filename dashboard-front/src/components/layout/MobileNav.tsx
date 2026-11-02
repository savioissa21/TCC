import { LayoutDashboard, LogOut, Menu, Sparkles, Store, X } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/minhas-lojas", label: "Minhas Lojas", icon: Store },
];

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function closeAndFocusTrigger() {
    setIsOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-controls="mobile-navigation"]')?.focus());
  }

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border/80 bg-paper/92 px-4 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 -rotate-6 items-center justify-center rounded-[0.65rem] bg-ink text-[#a8e6c3] shadow-sm">
          <Sparkles size={15} aria-hidden="true" />
        </span>
        <span className="font-black tracking-[0.12em] text-ink">NEXO</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((value) => !value)}
      >
        {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </Button>

      {isOpen && (
        <div
          id="mobile-navigation"
          onKeyDown={(event) => { if (event.key === "Escape") closeAndFocusTrigger(); }}
          className="absolute inset-x-0 top-16 h-[calc(100dvh-4rem)] overflow-y-auto bg-ink px-4 py-6 text-surface shadow-2xl animate-in slide-in-from-top-3 duration-300"
        >
          <p className="mb-3 px-3 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-white/35">Navegação</p>
          <nav aria-label="Navegação móvel" className="space-y-2">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) => cn(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition",
                  isActive ? "bg-[#d9efe3] text-ink" : "text-white/65 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4 border-t border-white/10 pt-4">
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-white/5 p-3">
              <Avatar fallback={user?.name || "US"} className="border-white/10" />
              <div className="min-w-0">
                <span className="block truncate text-sm font-bold">{user?.name}</span>
                <span className="mt-0.5 block truncate text-xs text-white/45">{user?.email}</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-white/15 bg-white/5 text-white hover:bg-red-400/10 hover:text-red-100"
              onClick={() => { signOut(); navigate("/login"); }}
            >
              <LogOut size={16} className="mr-2" aria-hidden="true" /> Sair
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
