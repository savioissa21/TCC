import { Activity, TrendingUp, Star, Store, TrendingDown } from "lucide-react";
import { type ReviewStats, type EstablishmentSummary } from "../../types";

interface StatsGridProps {
  stats: ReviewStats;
  establishments: EstablishmentSummary[];
}

function StatCard({
  title,
  value,
  sub,
  icon,
  accentColor,
}: {
  title: string;
  value: string | number;
  sub: React.ReactNode;
  icon: React.ReactNode;
  accentColor: string;
}) {
  return (
    <div className="relative min-h-36 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentColor}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
          <div className="mt-2 min-h-8 text-xs leading-relaxed text-slate-500">{sub}</div>
        </div>
        <div className="shrink-0 rounded-xl bg-slate-50 p-2.5 ring-1 ring-inset ring-slate-100">{icon}</div>
      </div>
    </div>
  );
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Comentários analisados"
        value={stats.total}
        sub={
          stats.negative > 0 ? (
            <span className="flex items-center gap-1 text-red-500">
              <TrendingDown size={12} /> {stats.negative} negativas para agir
            </span>
          ) : (
            stats.total > 0 ? "Nenhum comentário negativo" : "Aguardando a primeira coleta"
          )
        }
        icon={<Activity size={20} className="text-indigo-500" />}
        accentColor="bg-indigo-500"
      />
      <StatCard
        title="Satisfação (IA)"
        value={stats.total > 0 ? `${stats.score}%` : "—"}
        sub={
          <span className={stats.score >= 70 ? "text-green-600" : stats.score >= 50 ? "text-yellow-600" : "text-red-500"}>
            {stats.total === 0 ? "Sem dados suficientes" : `${stats.positive} positivas de ${stats.total}`}
          </span>
        }
        icon={<TrendingUp size={20} className="text-green-500" />}
        accentColor="bg-green-500"
      />
      <StatCard
        title="Nota no Google"
        value={googleRating !== null ? googleRating.toFixed(1) : "—"}
        sub={googleRating !== null
          ? `${googleReviewCount.toLocaleString("pt-BR")} avaliações no Google`
          : "Aguardando uma nova coleta"}
        icon={<Star size={20} className="text-yellow-500 fill-yellow-500" />}
        accentColor="bg-yellow-500"
      />
      <StatCard
        title="Estabelecimentos"
        value={establishments.length}
        sub={
          establishments.length === 0
            ? "Adicione sua primeira loja"
            : `${establishments.reduce((s, e) => s + e.reviewCount, 0)} comentários analisados`
        }
        icon={<Store size={20} className="text-blue-500" />}
        accentColor="bg-blue-500"
      />
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div role="status" aria-label="Carregando indicadores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map(item => (
        <div key={item} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="h-3 w-28 rounded bg-slate-200" />
          <div className="mt-4 h-8 w-20 rounded bg-slate-200" />
          <div className="mt-3 h-3 w-40 max-w-full rounded bg-slate-100" />
        </div>
      ))}
      <span className="sr-only">Carregando indicadores...</span>
    </div>
  );
}
