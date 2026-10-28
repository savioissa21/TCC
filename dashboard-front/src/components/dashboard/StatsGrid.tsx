import { Activity, Star, TrendingDown, TrendingUp } from "lucide-react";
import type { EstablishmentSummary, ReviewStats } from "../../types";
import { MetricPanel } from "../ui/editorial";

interface StatsGridProps {
  stats: ReviewStats;
  establishments: EstablishmentSummary[];
}

export function StatsGrid({ stats, establishments }: StatsGridProps) {
  const storesWithGoogleRating = establishments.filter(
    (store) => store.googleRating !== null && (store.googleReviewCount ?? 0) > 0,
  );
  const googleReviewCount = storesWithGoogleRating.reduce(
    (sum, store) => sum + (store.googleReviewCount ?? 0),
    0,
  );
  const googleRating = googleReviewCount > 0
    ? storesWithGoogleRating.reduce(
        (sum, store) => sum + (store.googleRating ?? 0) * (store.googleReviewCount ?? 0),
        0,
      ) / googleReviewCount
    : null;

  return (
    <section aria-label="Indicadores principais" className="grid gap-4 sm:grid-cols-3">
      <MetricPanel
        label="Comentários analisados"
        value={stats.total}
        detail={stats.negative > 0
          ? <span className="inline-flex items-center gap-1 font-semibold text-red-700"><TrendingDown size={13} aria-hidden="true" /> {stats.negative} negativas para agir</span>
          : stats.total > 0 ? "Nenhum comentário negativo na amostra" : "Aguardando a primeira coleta"}
        icon={<Activity size={19} aria-hidden="true" />}
      />
      <MetricPanel
        label="Satisfação textual"
        value={stats.total > 0 ? `${stats.score}%` : "—"}
        detail={stats.total === 0 ? "Sem dados suficientes" : `${stats.positive} positivas de ${stats.total} comentários`}
        icon={<TrendingUp size={19} aria-hidden="true" />}
        tone={stats.total === 0 ? "default" : stats.score >= 70 ? "positive" : stats.score >= 50 ? "warning" : "danger"}
      />
      <MetricPanel
        label="Nota no Google"
        value={googleRating !== null ? googleRating.toFixed(1) : "—"}
        detail={googleRating !== null
          ? `${googleReviewCount.toLocaleString("pt-BR")} avaliações no Google`
          : "Aguardando uma nova coleta"}
        icon={<Star size={19} className="fill-amber-400 text-amber-500" aria-hidden="true" />}
      />
    </section>
  );
}

export function StatsGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando indicadores" className="grid gap-4 sm:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div key={item} data-skeleton="metric" className="h-40 animate-pulse rounded-[1.1rem] border border-border/80 bg-surface/70 p-5 shadow-editorial">
          <div className="h-3 w-28 rounded-full bg-ink/10" />
          <div className="mt-7 h-9 w-20 rounded-lg bg-ink/10" />
          <div className="mt-4 h-3 w-40 max-w-full rounded-full bg-ink/5" />
        </div>
      ))}
      <span className="sr-only">Carregando indicadores...</span>
    </div>
  );
}
