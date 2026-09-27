import { RefreshCcw, Plus, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils";

interface DashboardHeaderProps {
  userName?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onNewStore: () => void;
}

export function DashboardHeader({ userName, isLoading, onRefresh, onNewStore }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
          <Sparkles size={12} aria-hidden="true" /> Inteligência da experiência
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          Olá, {userName || "Gestor"} 👋
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
          Acompanhe a percepção dos clientes e os pontos que merecem atenção.
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCcw size={14} className={cn(isLoading && "animate-spin")} />
          Atualizar
        </button>
        <button
          onClick={onNewStore}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={14} />
          Nova Loja
        </button>
      </div>
    </div>
  );
}
