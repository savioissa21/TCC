import { MessageSquareText, Plus, Search, X } from "lucide-react";
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
    <section className="min-w-0 space-y-4 lg:col-span-4" aria-labelledby="reviews-heading">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="reviews-heading" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
            <MessageSquareText size={19} className="text-indigo-500" /> Avaliações
          </h2>
          <p className="text-xs text-slate-400">Comentários coletados no Google Maps</p>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
          {result.totalElements} {result.totalElements === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap gap-2" aria-label="Filtrar avaliações por sentimento">
          {FILTERS.map((item) => (
            <button key={item} type="button" aria-pressed={filter === item} onClick={() => changeFilter(item)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                filter === item
                  ? `${filterColors[item]} border-transparent shadow-sm`
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
              )}>
              {item}
              <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                filter === item ? "bg-white/20" : "bg-slate-100")}>
                {counts[item]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative">
          <label htmlFor="review-search" className="sr-only">Buscar avaliações por autor ou texto</label>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input id="review-search" type="search" placeholder="Buscar por autor ou trecho da avaliação..."
            value={search} onChange={(event) => changeSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-10 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10" />
          {search && (
            <button type="button" aria-label="Limpar busca" onClick={() => changeSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button onClick={fetchReviews} className="mt-3 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700">Tentar novamente</button>
        </div>
      ) : isLoading ? (
        <div role="status" aria-label="Carregando avaliações" className="grid gap-3">
          {[1, 2, 3].map(item => (
            <div key={item} className="h-40 animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex gap-3"><div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2"><div className="h-3 w-32 rounded bg-slate-200" /><div className="h-3 w-20 rounded bg-slate-100" /></div>
              </div>
              <div className="ml-0 mt-5 h-3 w-full rounded bg-slate-100 sm:ml-[52px] sm:w-4/5" />
              <div className="ml-0 mt-2 h-3 w-3/4 rounded bg-slate-100 sm:ml-[52px]" />
            </div>
          ))}
          <span className="sr-only">Carregando avaliações...</span>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-5 py-16 text-center">
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
          {result.totalPages > 1 && <nav aria-label="Paginação das avaliações" className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button disabled={page === 0} onClick={() => changePage(page - 1)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
              Anterior
            </button>
            <span className="text-xs font-medium text-slate-500 sm:text-sm">Página {result.number + 1} de {result.totalPages}</span>
            <button disabled={result.last} onClick={() => changePage(page + 1)}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
              Próxima
            </button>
          </nav>}
        </>
      )}
    </section>
  );
}
