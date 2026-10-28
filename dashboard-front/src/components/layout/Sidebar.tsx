import { LayoutDashboard, LogOut, Sparkles, Store } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { cn } from "../../lib/utils";
import { Avatar } from "../ui/avatar";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", index: "01" },
  { to: "/minhas-lojas", icon: Store, label: "Minhas Lojas", index: "02" },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col overflow-hidden bg-ink text-surface shadow-2xl md:flex">
      <div className="absolute -right-24 top-8 h-52 w-52 rounded-full bg-evergreen/20 blur-3xl" aria-hidden="true" />
      <div className="relative border-b border-white/10 px-6 py-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 -rotate-6 items-center justify-center rounded-xl bg-[#a8e6c3] text-ink shadow-lg shadow-black/10">
            <Sparkles size={18} aria-hidden="true" />
          </div>
          <div>
            <span className="block text-lg font-black tracking-[0.12em]">NEXO</span>
            <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-[0.18em] text-white/45">Voz do cliente</span>
          </div>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="relative flex-1 px-4 py-7">
        <p className="mb-3 px-3 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-white/35">Navegação</p>
        <div className="space-y-2">
          {NAV.map(({ to, icon: Icon, label, index }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                "group flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition duration-300 ease-editorial",
                isActive
                  ? "bg-[#d9efe3] text-ink shadow-lg shadow-black/10"
                  : "text-white/62 hover:translate-x-0.5 hover:bg-white/8 hover:text-white",
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", isActive ? "border-ink/10 bg-white/45" : "border-white/10 bg-white/5")}>
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{label}</span>
                  <span className={cn("text-[0.58rem] tracking-widest", isActive ? "text-ink/45" : "text-white/20")}>{index}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="relative border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 p-3">
          <Avatar fallback={user?.name || "US"} className="h-10 w-10 border-white/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-[0.68rem] text-white/42">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-bold text-white/60 transition duration-300 hover:border-red-300/20 hover:bg-red-400/10 hover:text-red-100"
        >
          <LogOut size={15} aria-hidden="true" />
          Sair
        </button>
      </div>
    </aside>
  );
}
