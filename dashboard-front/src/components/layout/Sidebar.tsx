import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Avatar } from "../ui/avatar";
import { LayoutDashboard, Store, LogOut, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/minhas-lojas", icon: Store, label: "Minhas Lojas" },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate("/login");
  }

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-slate-200 bg-white fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <Sparkles size={15} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">NEXO</span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menu</p>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Perfil */}
      <div className="border-t border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar
            fallback={user?.name || "US"}
            className="h-9 w-9 border border-slate-200 bg-slate-100 text-slate-700 text-sm font-bold"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 hover:border-red-200 transition"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </aside>
  );
}
