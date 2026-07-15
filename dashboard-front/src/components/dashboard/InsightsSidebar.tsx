import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Award, AlertCircle } from "lucide-react";
import { type Review, type AspectStat } from "../../types";
import { useMemo } from "react";

interface Props {
  reviews: Review[];
}

const SENTIMENT_COLORS = {
  Positivo: "#22c55e",
  Negativo: "#ef4444",
  Neutro: "#94a3b8",
};

const ASPECT_COLORS: Record<string, string> = {
  Atendimento: "#6366f1",
  Comida: "#f59e0b",
  Ambiente: "#3b82f6",
  Preço: "#8b5cf6",
};

function SentimentLabel({ viewBox, value, label }: any) {
  const { cx, cy } = viewBox;
  return (
    <>
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-slate-900 text-xl font-bold" style={{ fontSize: 24, fontWeight: 700 }}>
        {value}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 11, fill: "#64748b" }}>
        {label}
      </text>
    </>
  );
}

export function InsightsSidebar({ reviews }: Props) {
  const sentimentData = useMemo(() => {
    const positive = reviews.filter((r) => r.overallSentiment === "Positivo").length;
    const negative = reviews.filter((r) => r.overallSentiment === "Negativo").length;
    const neutral = reviews.filter((r) => r.overallSentiment === "Neutro").length;
    return [
      { name: "Positivo", value: positive, color: SENTIMENT_COLORS.Positivo },
      { name: "Negativo", value: negative, color: SENTIMENT_COLORS.Negativo },
      { name: "Neutro", value: neutral, color: SENTIMENT_COLORS.Neutro },
    ].filter((d) => d.value > 0);
  }, [reviews]);

  const positivePercent = useMemo(() => {
    if (reviews.length === 0) return 0;
    return Math.round((reviews.filter((r) => r.overallSentiment === "Positivo").length / reviews.length) * 100);
  }, [reviews]);

  const aspectStats = useMemo<AspectStat[]>(() => {
    const map: Record<string, { positive: number; negative: number; neutral: number }> = {};
    reviews.forEach((r) => {
      r.aspects?.forEach((a) => {
        if (!map[a.name]) map[a.name] = { positive: 0, negative: 0, neutral: 0 };
        if (a.sentiment === "Positivo") map[a.name].positive++;
        else if (a.sentiment === "Negativo") map[a.name].negative++;
        else map[a.name].neutral++;
      });
    });
    return Object.entries(map).map(([name, c]) => {
      const total = c.positive + c.negative + c.neutral;
      return { name, ...c, total, score: total > 0 ? Math.round((c.positive / total) * 100) : 0 };
    }).sort((a, b) => b.total - a.total);
  }, [reviews]);

  const highlights = aspectStats.filter((a) => a.score >= 60).sort((a, b) => b.score - a.score).slice(0, 2);
  const attentions = aspectStats.filter((a) => a.score < 60).sort((a, b) => a.score - b.score).slice(0, 2);

  if (reviews.length === 0) {
    return (
      <div className="col-span-4 md:col-span-3 space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Insights da IA</h2>
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
          <p className="text-slate-400 text-sm">Adicione avaliações para ver os insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="col-span-4 md:col-span-3 space-y-4">
      <h2 className="text-xl font-semibold tracking-tight">Insights da IA</h2>

      {/* Donut de Sentimento */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-700 mb-1">Distribuição de Sentimento</p>
        <p className="text-xs text-slate-400 mb-3">{reviews.length} avaliações analisadas</p>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
              >
                {sentimentData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
                <SentimentLabel viewBox={{ cx: "50%", cy: "50%" }} value={positivePercent} label="positivos" />
              </Pie>
              <Tooltip formatter={(val: number | undefined) => [`${val || 0} avaliações`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-1">
          {sentimentData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: d.color }} />
              {d.name}: <strong>{d.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart de Aspectos */}
      {aspectStats.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-700 mb-3">Score por Aspecto</p>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aspectStats} layout="vertical" margin={{ left: -8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: "#475569" }} />
                <Tooltip
                  formatter={(val: number | undefined) => [`${val || 0}%`, "Score positivo"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={16}>
                  {aspectStats.map((entry, i) => (
                    <Cell key={i} fill={ASPECT_COLORS[entry.name] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Destaques */}
      {highlights.length > 0 && (
        <div className="rounded-xl border border-green-100 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5 mb-3">
            <Award size={14} className="text-green-600" /> Pontos Fortes
          </p>
          <div className="space-y-2">
            {highlights.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <span className="text-sm text-green-800 font-medium">{a.name}</span>
                <span className="text-xs font-bold text-green-700 bg-green-100 rounded-full px-2 py-0.5">{a.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atenção */}
      {attentions.length > 0 && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800 flex items-center gap-1.5 mb-3">
            <AlertCircle size={14} className="text-red-600" /> Pontos de Atenção
          </p>
          <div className="space-y-2">
            {attentions.map((a) => (
              <div key={a.name} className="flex items-center justify-between">
                <span className="text-sm text-red-800 font-medium">{a.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 rounded-full bg-red-200 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${a.score}%` }} />
                  </div>
                  <span className="text-xs font-bold text-red-700 w-8 text-right">{a.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
