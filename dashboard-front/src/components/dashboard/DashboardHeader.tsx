import { RefreshCcw, Plus } from "lucide-react";
import { cn } from "../../lib/utils";

interface DashboardHeaderProps {
  userName?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onNewStore: () => void;
}

export function DashboardHeader({ userName, isLoading, onRefresh, onNewStore }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Olá, {userName || "Gestor"} 👋
        </h1>
        <p className="text-slate-500 mt-0.5 text-sm">
          Aqui está a inteligência de negócios do seu estabelecimento.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 shadow-sm"
        >
          <RefreshCcw size={14} className={cn(isLoading && "animate-spin")} />
          Atualizar
        </button>
        <button
          onClick={onNewStore}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
        >
          <Plus size={14} />
          Nova Loja
        </button>
      </div>
    </div>
  );
}
