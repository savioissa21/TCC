import { Activity, CircleGauge, Info, Target } from "lucide-react";
import type { EstablishmentSummary, ReviewStats } from "../../types";
import { buildExecutiveSummary } from "../../lib/executiveSummary";

interface ExecutiveSummaryProps {
  stats: ReviewStats;
  stores: EstablishmentSummary[];
  isLoading: boolean;
}

export function ExecutiveSummary({ stats, stores, isLoading }: ExecutiveSummaryProps) {
  if (isLoading) {
    return (
      <section role="status" aria-label="Carregando leitura executiva" className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-36 animate-pulse rounded-[1.1rem] border border-border bg-surface/75 shadow-editorial" />
        ))}
        <span className="sr-only">Carregando leitura executiva...</span>
      </section>
    );
  }

  const summary = buildExecutiveSummary(stats, stores);
  const { priority, coverage, recentMovement } = summary;

  return (
    <section aria-label="Leitura executiva" className="grid gap-3 sm:grid-cols-3">
      <article className="relative overflow-hidden rounded-[1.1rem] border border-border bg-surface/90 p-4 shadow-editorial">
        <div className="absolute inset-y-0 left-0 w-1 bg-red-500/75" />
        <SummaryHeading icon={<Target size={15} />} title="Onde agir" />
        {priority ? (
          <>
            <p className="mt-4 text-xl font-black tracking-[-0.035em] text-ink">{priority.aspect}</p>
            <p className="mt-1 text-xs font-bold text-red-700">{priority.score}% positivas · {priority.mentions} menções</p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Pior resultado entre aspectos com base suficiente.</p>
          </>
        ) : (
          <>
            <p className="mt-4 text-lg font-black tracking-[-0.025em] text-ink">Base insuficiente</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Nenhum aspecto atingiu 10 menções.</p>
          </>
        )}
      </article>

      <article className="rounded-[1.1rem] border border-border bg-surface/90 p-4 shadow-editorial">
        <SummaryHeading icon={<CircleGauge size={15} />} title="Base analisada" />
        <p className="mt-4 text-xl font-black tracking-[-0.035em] text-ink">
          {coverage.analyzed} {coverage.analyzed === 1 ? "comentário analisado" : "comentários analisados"}
        </p>
        {coverage.percent !== null ? (
          <>
            <p className="mt-1 text-xs font-bold text-evergreen">{coverage.percent}% de cobertura textual indicativa</p>
            <p className="mt-3 flex gap-1.5 text-[0.7rem] leading-relaxed text-muted-foreground">
              <Info size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              O total do Google pode incluir avaliações sem comentário.
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Total do Google indisponível</p>
        )}
      </article>

      <article className="rounded-[1.1rem] border border-border bg-surface/90 p-4 shadow-editorial">
        <SummaryHeading icon={<Activity size={15} />} title="Movimento recente" />
        <p className="mt-4 text-xl font-black tracking-[-0.035em] text-ink">
          {recentMovement.newReviews === 0
            ? "Nenhuma avaliação nova na última coleta"
            : `${recentMovement.newReviews} ${recentMovement.newReviews === 1 ? "nova" : "novas"} na última coleta`}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {recentMovement.latestSuccessAt
            ? `Atualizado em ${formatDate(recentMovement.latestSuccessAt)}`
            : "Sem coleta concluída"}
        </p>
      </article>
    </section>
  );
}

function SummaryHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-evergreen">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent" aria-hidden="true">{icon}</span>
      {title}
    </h2>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}
