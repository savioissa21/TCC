import { useState, useMemo } from "react";
import { Search, Zap, Plus } from "lucide-react";
import { ReviewCard } from "./ReviewCard";
import { cn } from "../../lib/utils";
import { type Review, type Sentiment } from "../../types";

type Filter = "Todos" | Sentiment;

interface ReviewFeedProps {
  reviews: Review[];
  isLoading: boolean;
  onAddStore: () => void;
}

const FILTERS: Filter[] = ["Todos", "Positivo", "Negativo", "Neutro"];
const PAGE_SIZE = 8;

export function ReviewFeed({ reviews, isLoading, onAddStore }: ReviewFeedProps) {
  const [filter, setFilter] = useState<Filter>("Todos");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter !== "Todos") list = list.filter((r) => r.overallSentiment === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.text?.toLowerCase().includes(q) || r.author?.toLowerCase().includes(q));
    }
    return list;
  }, [reviews, filter, search]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const counts = useMemo<Record<Filter, number>>(
    () => ({
      Todos: reviews.length,
      Positivo: reviews.filter((r) => r.overallSentiment === "Positivo").length,
      Negativo: reviews.filter((r) => r.overallSentiment === "Negativo").length,
      Neutro: reviews.filter((r) => r.overallSentiment === "Neutro").length,
    }),
    [reviews]
  );

  function handleFilterChange(f: Filter) {
    setFilter(f);
    setPage(1);
  }

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
        <span className="text-sm text-slate-400">{filtered.length} resultados</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
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
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/10 transition"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-3 rounded-xl border-2 border-dashed border-slate-200">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-4 border-slate-200" />
            <div className="absolute inset-0 rounded-full border-4 border-t-slate-900 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm">Carregando avaliações...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
          {reviews.length === 0 ? (
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
            {paginated.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setPage((p) => p + 1)}
              className="w-full rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Carregar mais ({filtered.length - paginated.length} restantes)
            </button>
          )}
        </>
      )}
    </div>
  );
}
