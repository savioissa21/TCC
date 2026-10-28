import { Sparkles } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-canvas flex min-h-screen flex-col items-center justify-center px-6" role="status" aria-live="polite">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-[#a8e6c3] shadow-lift">
          <Sparkles size={25} className="animate-pulse" aria-hidden="true" />
          <span className="absolute inset-[-7px] animate-spin rounded-[1.35rem] border border-evergreen/15 border-t-evergreen" aria-hidden="true" />
        </div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-evergreen">Preparando sua análise</p>
        <p className="mt-2 text-sm text-muted-foreground">Carregando NEXO...</p>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
