import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles } from "lucide-react";

export function PrivateRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  // 1. Estado de Carregamento (Verificando Token no LocalStorage)
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 dark:border-slate-100 mb-4"></div>
        <div className="flex items-center gap-2 animate-pulse text-slate-500">
            <Sparkles size={16} />
            <span className="text-sm font-medium">Carregando NEXO...</span>
        </div>
      </div>
    );
  }

  // 2. Se não estiver autenticado, redireciona para Login
  // "replace" impede que o usuário volte para a rota protegida clicando em "Voltar"
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 3. Se passou, renderiza as rotas filhas (Outlet)
  return <Outlet />;
}