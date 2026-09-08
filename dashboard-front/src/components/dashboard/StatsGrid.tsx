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
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className={`absolute top-0 left-0 h-full w-1 ${accentColor}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1.5 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
          <div className="mt-1.5 text-xs text-slate-500">{sub}</div>
        </div>
        <div className={`rounded-lg p-2.5 bg-slate-50`}>{icon}</div>
      </div>
    </div>
  );
}

export function StatsGrid({ stats, establishments }: StatsGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total de Avaliações"
        value={stats.total}
        sub={
          stats.negative > 0 ? (
            <span className="flex items-center gap-1 text-red-500">
              <TrendingDown size={12} /> {stats.negative} negativas para agir
            </span>
          ) : (
            "Nenhuma avaliação negativa!"
          )
        }
        icon={<Activity size={20} className="text-indigo-500" />}
        accentColor="bg-indigo-500"
      />
      <StatCard
        title="Satisfação (IA)"
        value={`${stats.score}%`}
        sub={
          <span className={stats.score >= 70 ? "text-green-600" : stats.score >= 50 ? "text-yellow-600" : "text-red-500"}>
            {stats.score >= 70 ? "Excelente" : stats.score >= 50 ? "Regular" : "Precisa melhorar"} · {stats.positive} positivas
          </span>
        }
        icon={<TrendingUp size={20} className="text-green-500" />}
        accentColor="bg-green-500"
      />
      <StatCard
        title="Nota Média"
        value={stats.avgRating.toFixed(1)}
        sub="Google Maps · escala de 1 a 5"
        icon={<Star size={20} className="text-yellow-500 fill-yellow-500" />}
        accentColor="bg-yellow-500"
      />
      <StatCard
        title="Estabelecimentos"
        value={establishments.length}
        sub={
          establishments.length === 0
            ? "Adicione sua primeira loja"
            : `${establishments.reduce((s, e) => s + e.reviewCount, 0)} avaliações monitoradas`
        }
        icon={<Store size={20} className="text-blue-500" />}
        accentColor="bg-blue-500"
      />
    </div>
  );
}
