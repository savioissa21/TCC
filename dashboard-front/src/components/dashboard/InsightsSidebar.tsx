import {
  Bar, BarChart, Cell, CartesianGrid, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertCircle, Award, BarChart3, Info } from "lucide-react";
import { type ReviewStats } from "../../types";

interface Props {
  stats: ReviewStats;
}

const MIN_ASPECT_MENTIONS = 10;
const SENTIMENT_COLORS = { Positivo: "#22c55e", Negativo: "#ef4444", Neutro: "#94a3b8" };
const ASPECT_COLORS: Record<string, string> = {
  Atendimento: "#6366f1", Comida: "#f59e0b", Ambiente: "#3b82f6", Preço: "#8b5cf6",
};

export function InsightsSidebar({ stats }: Props) {
  const sentimentData = [
    { name: "Positivo", value: stats.positive, color: SENTIMENT_COLORS.Positivo },
    { name: "Negativo", value: stats.negative, color: SENTIMENT_COLORS.Negativo },
    { name: "Neutro", value: stats.neutral, color: SENTIMENT_COLORS.Neutro },
  ].filter(item => item.value > 0);
  const reliableAspects = stats.aspects.filter(aspect => aspect.total >= MIN_ASPECT_MENTIONS);
  const limitedAspects = stats.aspects.filter(aspect => aspect.total < MIN_ASPECT_MENTIONS);
  const highlights = reliableAspects.filter(aspect => aspect.score >= 60)
    .sort((a, b) => b.score - a.score).slice(0, 2);
  const attentions = reliableAspects.filter(aspect => aspect.score < 60)
    .sort((a, b) => a.score - b.score).slice(0, 2);

  if (stats.total === 0) {
    return (
      <section className="min-w-0 space-y-4 lg:col-span-3" aria-labelledby="insights-heading">
        <SectionTitle />
        <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
          <div className="mb-3 rounded-xl bg-slate-100 p-3 text-slate-400"><BarChart3 size={22} /></div>
          <p className="font-semibold text-slate-700">Insights aguardando dados</p>
          <p className="mt-1 max-w-xs text-sm text-slate-400">Os gráficos aparecem depois da primeira coleta de avaliações.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4 lg:col-span-3" aria-labelledby="insights-heading">
      <SectionTitle />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Distribuição de sentimento</h3>
            <p className="mt-0.5 text-xs text-slate-400">{stats.total} avaliações analisadas</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Visão geral</span>
        </div>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={52} outerRadius={72}
                paddingAngle={3} dataKey="value">
                {sentimentData.map(entry => <Cell key={entry.name} fill={entry.color} strokeWidth={0} />)}
              </Pie>
              <text x="50%" y="46%" textAnchor="middle" className="fill-slate-950 text-xl font-bold">{stats.score}%</text>
              <text x="50%" y="58%" textAnchor="middle" className="fill-slate-500 text-xs">positivas</text>
              <Tooltip formatter={(value: number | undefined) => [`${value || 0} avaliações`, "Quantidade"]}
                contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
          {sentimentData.map(item => (
            <div key={item.name} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              {item.name} <strong className="text-slate-900">{item.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {stats.aspects.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Satisfação por aspecto</h3>
              <p className="mt-0.5 text-xs text-slate-400">Percentual de menções positivas</p>
            </div>
            <span title="Quantidade de menções analisadas por aspecto" className="text-slate-400"><Info size={15} /></span>
          </div>
          <div style={{ height: Math.max(150, stats.aspects.length * 42) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.aspects} layout="vertical" margin={{ left: -8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`}
                  tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip formatter={(value: number | undefined) => [`${value || 0}%`, "Menções positivas"]}
                  contentStyle={{ fontSize: 12, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <Bar dataKey="score" radius={[0, 5, 5, 0]} maxBarSize={17}>
                  {stats.aspects.map(aspect => (
                    <Cell key={aspect.name} fill={ASPECT_COLORS[aspect.name] || "#6366f1"}
                      opacity={aspect.total < MIN_ASPECT_MENTIONS ? 0.45 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
            {stats.aspects.map(aspect => (
              <div key={aspect.name} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-600">{aspect.name}</span>
                <span className="text-slate-500">
                  {aspect.total} {aspect.total === 1 ? "menção" : "menções"}
                  {aspect.total < MIN_ASPECT_MENTIONS && (
                    <span className="ml-1.5 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">amostra pequena</span>
                  )}
                </span>
              </div>
            ))}
          </div>
          {limitedAspects.length > 0 && (
            <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
              <Info size={14} className="mt-0.5 shrink-0" /> Aspectos com menos de {MIN_ASPECT_MENTIONS} menções são exibidos, mas não entram nos destaques.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-700">Nenhum aspecto identificado</p>
          <p className="mt-1 text-xs text-slate-400">As avaliações gerais existem, mas ainda não há menções aos aspectos monitorados.</p>
        </div>
      )}

      {highlights.length > 0 && (
        <InsightList title="Pontos fortes" icon={<Award size={15} />} items={highlights} tone="green" />
      )}
      {attentions.length > 0 && (
        <InsightList title="Pontos de atenção" icon={<AlertCircle size={15} />} items={attentions} tone="red" />
      )}
    </section>
  );
}

function SectionTitle() {
  return (
    <div>
      <h2 id="insights-heading" className="text-lg font-bold tracking-tight text-slate-900">Insights da IA</h2>
      <p className="text-xs text-slate-400">Tendências calculadas sobre o conjunto selecionado</p>
    </div>
  );
}

function InsightList({ title, icon, items, tone }: {
  title: string;
  icon: React.ReactNode;
  items: ReviewStats["aspects"];
  tone: "green" | "red";
}) {
  const style = tone === "green"
    ? "border-green-100 bg-green-50 text-green-800"
    : "border-red-100 bg-red-50 text-red-800";
  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <p className="mb-3 flex items-center gap-1.5 text-sm font-bold">{icon} {title}</p>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{item.name}</span>
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{item.score}% · n={item.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightsSidebarSkeleton() {
  return (
    <div role="status" aria-label="Carregando insights" className="min-w-0 space-y-4 lg:col-span-3">
      <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
      <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      <span className="sr-only">Carregando insights...</span>
    </div>
  );
}
