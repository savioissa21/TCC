import { Search, Zap, Plus } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import { cn } from "../../lib/utils";
import { type ReviewStats } from "../../types";
import { useReviews } from "../../hooks/useReviews";

type Filter = "Todos" | "Positivo" | "Negativo" | "Neutro";

interface ReviewFeedProps {
  feed: ReturnType<typeof useReviews>;
  stats: ReviewStats;
  onAddStore: () => void;
}

const FILTERS: Filter[] = ["Todos", "Positivo", "Negativo", "Neutro"];

export function ReviewFeed({ feed, stats, onAddStore }: ReviewFeedProps) {
  const { reviews, result, page, filter, search, isLoading, error,
    changeFilter, changeSearch, changePage, fetchReviews } = feed;
  const counts: Record<Filter, number> = {
    Todos: stats.total, Positivo: stats.positive, Negativo: stats.negative, Neutro: stats.neutral,
  };

  const filterColors: Record<Filter, string> = {
    Todos: "bg-slate-900 text-white",
    Positivo: "bg-green-500 text-white",
    Negativo: "bg-red-500 text-white",
    Neutro: "bg-slate-400 text-white",
  };

  return (
    <div className="col-span-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
          <Zap size={20} className="text-yellow-500 fill-yellow-500" />
          Avaliações
        </h2>
        <span className="text-sm text-slate-400">{result.totalElements} resultados</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => changeFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all border",
              filter === f
                ? filterColors[f] + " border-transparent shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            )}
          >
            {f}
            <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", filter === f ? "bg-white/20" : "bg-slate-100")}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por autor ou texto..."
          value={search}
          onChange={(e) => changeSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition"
        />
      </div>

      {/* Lista */}
      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button onClick={fetchReviews} className="mt-3 text-sm underline">Tentar novamente</button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 rounded-xl border-2 border-dashed border-slate-200">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-t-slate-900 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Carregando avaliações...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          {stats.total === 0 ? (
            <>
              <p className="text-slate-500 font-medium mb-3">Nenhuma avaliação ainda.</p>
              <button
                onClick={onAddStore}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
              >
                <Plus size={14} /> Cadastrar primeira loja
              </button>
            </>
          ) : (
            <p className="text-slate-400 text-sm">Nenhum resultado para o filtro aplicado.</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-3">
            <button disabled={page === 0} onClick={() => changePage(page - 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">
              Anterior
            </button>
            <span className="text-sm text-slate-500">Página {result.number + 1} de {result.totalPages}</span>
            <button disabled={result.last} onClick={() => changePage(page + 1)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
