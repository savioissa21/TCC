import { motion } from "framer-motion";
import { Inbox, MessageSquareText, Plus, Search, X } from "lucide-react";
import type { useReviews } from "../../hooks/useReviews";
import { staggerContainer, staggerItem } from "../../lib/motion";
import { cn } from "../../lib/utils";
import type { ReviewStats } from "../../types";
import { Button } from "../ui/button";
import { EditorialLabel, Surface } from "../ui/editorial";
import { ReviewCard } from "./ReviewCard";

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
  const activeStyles: Record<Filter, string> = {
    Todos: "border-ink bg-ink text-surface",
    Positivo: "border-emerald-700 bg-emerald-700 text-white",
    Negativo: "border-red-700 bg-red-700 text-white",
    Neutro: "border-slate-600 bg-slate-600 text-white",
  };

  return (
    <section className="min-w-0 space-y-4 lg:col-span-4" aria-labelledby="reviews-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <EditorialLabel>Voz do cliente</EditorialLabel>
          <h2 id="reviews-heading" className="mt-1.5 flex items-center gap-2 text-xl font-black tracking-[-0.035em] text-ink">
            <MessageSquareText size={19} className="text-evergreen" aria-hidden="true" /> Avaliações recentes
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Comentários com texto coletados no Google Maps</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-bold text-muted-foreground">
          {result.totalElements} {result.totalElements === 1 ? "resultado" : "resultados"}
        </span>
      </div>

      <Surface className="space-y-3 p-3 sm:p-4">
        <div className="flex flex-wrap gap-2" aria-label="Filtrar avaliações por sentimento">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={filter === item}
              onClick={() => changeFilter(item)}
              className={cn(
                "min-h-10 rounded-full border px-3 text-xs font-bold transition duration-300 ease-editorial",
                filter === item
                  ? `${activeStyles[item]} shadow-sm`
                  : "border-border bg-surface text-muted-foreground hover:-translate-y-0.5 hover:border-evergreen/35 hover:text-ink",
              )}
            >
              {item}
              <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", filter === item ? "bg-white/16" : "bg-muted")}>{counts[item]}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <label htmlFor="review-search" className="sr-only">Buscar avaliações por autor ou texto</label>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            id="review-search"
            type="search"
            placeholder="Buscar por autor ou trecho da avaliação..."
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
            className="h-12 w-full rounded-xl border border-input bg-paper/55 py-2.5 pl-10 pr-11 text-sm text-ink outline-none transition duration-300 placeholder:text-muted-foreground/75 hover:border-evergreen/35 focus:border-evergreen focus:bg-surface focus:ring-2 focus:ring-evergreen/15"
          />
          {search && (
            <button type="button" aria-label="Limpar busca" onClick={() => changeSearch("")} className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-ink">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </Surface>

      {error ? (
        <div role="alert" className="rounded-[1.1rem] border border-red-200 bg-red-50 p-6 text-center shadow-editorial">
          <p className="text-sm font-semibold text-red-800">{error}</p>
          <Button variant="outline" onClick={fetchReviews} className="mt-4 border-red-200 text-red-800 hover:bg-red-100">Tentar novamente</Button>
        </div>
      ) : isLoading ? (
        <div role="status" aria-label="Carregando avaliações" className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-44 animate-pulse rounded-[1.1rem] border border-border/80 bg-surface/75 p-5 shadow-editorial">
              <div className="flex gap-3"><div className="h-10 w-10 rounded-xl bg-ink/10" /><div className="flex-1 space-y-2"><div className="h-3 w-32 rounded-full bg-ink/10" /><div className="h-3 w-20 rounded-full bg-ink/5" /></div></div>
              <div className="mt-6 h-3 w-full rounded-full bg-ink/5 sm:ml-[52px] sm:w-4/5" />
              <div className="mt-2 h-3 w-3/4 rounded-full bg-ink/5 sm:ml-[52px]" />
            </div>
          ))}
          <span className="sr-only">Carregando avaliações...</span>
        </div>
      ) : reviews.length === 0 ? (
        <Surface className="border-dashed px-5 py-16 text-center">
          {stats.total === 0 ? (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-evergreen"><Inbox size={22} aria-hidden="true" /></span>
              <h3 className="mt-4 text-lg font-black tracking-[-0.025em] text-ink">Sua primeira análise começa com uma loja</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Cadastre o endereço do Google Maps para coletar comentários e visualizar os indicadores.</p>
              <Button onClick={onAddStore} className="mt-5"><Plus size={15} className="mr-2" aria-hidden="true" /> Cadastrar primeira loja</Button>
            </>
          ) : (
            <><p className="font-bold text-ink">Nenhum resultado encontrado</p><p className="mt-1 text-sm text-muted-foreground">Tente ajustar o sentimento ou o termo pesquisado.</p></>
          )}
        </Surface>
      ) : (
        <>
          <motion.div className="grid gap-3" initial="hidden" animate="visible" variants={staggerContainer} key={`${filter}-${search}-${page}`}>
            {reviews.map((review) => <motion.div key={review.id} variants={staggerItem}><ReviewCard review={review} /></motion.div>)}
          </motion.div>
          {result.totalPages > 1 && (
            <nav aria-label="Paginação das avaliações" className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/85 p-2 shadow-editorial">
              <button disabled={page === 0} onClick={() => changePage(page - 1)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35">Anterior</button>
              <span className="text-xs font-semibold text-muted-foreground sm:text-sm">Página {result.number + 1} de {result.totalPages}</span>
              <button disabled={result.last} onClick={() => changePage(page + 1)} className="min-h-10 rounded-lg px-3 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-35">Próxima</button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
