import { useCallback, useEffect, useState } from "react";
import { useToast } from "../hooks/useToast";
import { establishmentService } from "../services/establishmentService";
import { type EstablishmentSummary } from "../types";
import { CreateEstablishmentModal } from "../components/modals/CreateEstablishmentModal";
import { MiningProgressModal } from "../components/modals/MiningProgressModal";
import {
  Plus,
  Store,
  Star,
  Trash2,
  ExternalLink,
  RefreshCw,
  Clock3,
  CircleAlert,
  Sparkles,
} from "lucide-react";
import { cn } from "../lib/utils";

const MINING_LABELS: Record<string, string> = {
  QUEUED: "Na fila", RUNNING: "Em execução", COMPLETED: "Concluída", FAILED: "Falhou",
};

const MINING_STYLES: Record<string, { badge: string; dot: string }> = {
  QUEUED: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  RUNNING: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "animate-pulse bg-blue-500" },
  COMPLETED: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  FAILED: { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
};

function getMapsHostname(mapsUrl: string) {
  try {
    return new URL(mapsUrl).hostname.replace(/^www\./, "");
  } catch {
    return "Google Maps";
  }
}

export function MinhasLojas() {
  const { toast } = useToast();
  const [establishments, setEstablishments] = useState<EstablishmentSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [miningJobId, setMiningJobId] = useState<string | null>(null);
  const [miningEstName, setMiningEstName] = useState("");
  const [loadError, setLoadError] = useState(false);

  const loadEstablishments = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await establishmentService.getAll();
      setEstablishments(data);
      setLoadError(false);
    } catch {
      setLoadError(true);
      toast.error("Não foi possível carregar os estabelecimentos.");
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEstablishments();
  }, [loadEstablishments]);

  async function handleCreate(data: { name: string; url: string }) {
    setIsCreating(true);
    try {
      const { establishment, jobId } = await establishmentService.create(data);
      setIsCreating(false);
      setIsCreateOpen(false);
      setMiningEstName(establishment.name);
      setMiningJobId(jobId);
      toast.info("Mineração iniciada!");
      setEstablishments((prev) => [
        ...prev,
        {
          id: establishment.id,
          name: establishment.name,
          mapsUrl: establishment.mapsUrl,
          reviewCount: 0,
          avgRating: 0,
          satisfactionScore: 0,
          automaticUpdatesEnabled: true,
          lastMiningAt: null,
          lastMiningSuccessAt: null,
          nextMiningAt: null,
          lastNewReviews: 0,
          lastMiningStatus: "QUEUED",
          lastMiningMessage: "Aguardando na fila de mineração...",
        },
      ]);
    } catch (err) {
      setIsCreating(false);
      const message =
        err instanceof Error ? err.message : "Erro ao criar estabelecimento.";
      toast.error(message);
    }
  }

  async function handleDelete(est: EstablishmentSummary) {
    if (
      !confirm(
        `Excluir "${est.name}" e todas as suas avaliações? Esta ação não pode ser desfeita.`,
      )
    )
      return;
    setDeletingId(est.id);
    try {
      await establishmentService.delete(est.id);
      setEstablishments((prev) => prev.filter((e) => e.id !== est.id));
      toast.success(`"${est.name}" excluído com sucesso.`);
    } catch {
      toast.error("Não foi possível excluir o estabelecimento.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleMiningComplete(message?: string) {
    setMiningJobId(null);
    setRefreshingId(null);
    if (message?.startsWith("Coleta parcial:")) toast.info(message);
    else toast.success(`Mineração de "${miningEstName}" concluída!`);
    loadEstablishments();
  }

  async function handleRefresh(est: EstablishmentSummary) {
    setRefreshingId(est.id);
    try {
      const active = est.lastMiningStatus === "QUEUED" || est.lastMiningStatus === "RUNNING";
      const { jobId } = active
        ? await establishmentService.getLatestJob(est.id)
        : await establishmentService.refresh(est.id);
      setMiningEstName(est.name);
      setMiningJobId(jobId);
      if (!active) toast.info(`Buscando novas avaliações de "${est.name}".`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a loja.");
    } finally {
      setRefreshingId(null);
      void loadEstablishments();
    }
  }

  async function handleAutomaticToggle(est: EstablishmentSummary) {
    const enabled = !est.automaticUpdatesEnabled;
    setTogglingId(est.id);
    try {
      await establishmentService.setAutomaticUpdates(est.id, enabled);
      setEstablishments((current) => current.map((item) =>
        item.id === est.id ? { ...item, automaticUpdatesEnabled: enabled } : item,
      ));
      toast.success(enabled ? "Atualizações automáticas ativadas." : "Atualizações automáticas pausadas.");
    } catch {
      toast.error("Não foi possível alterar as atualizações automáticas.");
    } finally {
      setTogglingId(null);
    }
  }

  function formatUpdateDate(value: string | null) {
    if (!value) return "Ainda não atualizada";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  }

  const scoreColor = (score: number) =>
    score >= 70
      ? "text-green-600 bg-green-50"
      : score >= 50
        ? "text-yellow-700 bg-yellow-50"
        : "text-red-600 bg-red-50";

  return (
    <>
      <div className="space-y-6 animate-in fade-in duration-500 pb-12">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
              <Sparkles size={12} aria-hidden="true" />
              Monitoramento contínuo
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Minhas Lojas
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {establishments.length} estabelecimento
              {establishments.length !== 1 ? "s" : ""} monitorado
              {establishments.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md sm:w-auto"
          >
            <Plus size={16} aria-hidden="true" /> Nova Loja
          </button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Acompanhe coletas, volume de avaliações e atualização semanal.
          </p>
          <button
            type="button"
            onClick={() => void loadEstablishments()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
            Atualizar status
          </button>
        </div>
        {loadError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <CircleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">Não foi possível atualizar as lojas.</p>
            <p className="mt-0.5 text-red-700">Use “Atualizar status” para tentar novamente.</p>
          </div>
        </div>}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[390px] animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
              />
            ))}
          </div>
        ) : establishments.length === 0 && !loadError ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Store size={22} className="text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700">
              Nenhum estabelecimento cadastrado
            </p>
            <p className="text-sm text-slate-400 mt-1 mb-5">
              Cadastre sua primeira loja para começar a monitorar avaliações.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={14} /> Adicionar Loja
            </button>
          </div>
        ) : (
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {establishments.map((est) => (
              <div
                key={est.id}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 shadow-sm">
                      <Store size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold leading-tight text-slate-950" title={est.name}>
                        {est.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-slate-400">
                        {getMapsHostname(est.mapsUrl)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={est.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${est.name} no Google Maps`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p
                    role="status"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
                      MINING_STYLES[est.lastMiningStatus || ""]?.badge ?? "bg-slate-100 text-slate-600 ring-slate-200",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", MINING_STYLES[est.lastMiningStatus || ""]?.dot ?? "bg-slate-400")} />
                    {MINING_LABELS[est.lastMiningStatus || ""] || "Ainda não iniciada"}
                  </p>
                  <button
                    type="button"
                    aria-pressed={est.automaticUpdatesEnabled}
                    onClick={() => handleAutomaticToggle(est)}
                    disabled={togglingId === est.id}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50",
                      est.automaticUpdatesEnabled
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                    title="Ativar ou pausar a atualização semanal"
                  >
                    {est.automaticUpdatesEnabled ? "Semanal ativa" : "Pausada"}
                  </button>
                </div>
                {est.lastMiningStatus === "FAILED" && <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                  <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{est.lastMiningMessage}</span>
                </p>}
                {est.lastMiningMessage?.startsWith("Coleta parcial:") &&
                  <p role="status" className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{est.lastMiningMessage}</span>
                  </p>}
                <div className="mb-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
                    <p className="text-lg font-bold tabular-nums text-slate-950">
                      {est.reviewCount}
                    </p>
                    <p className="text-[10px] leading-tight text-slate-500">
                      avaliações
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <p className="text-lg font-bold tabular-nums text-slate-950">
                        {est.reviewCount > 0 ? est.avgRating.toFixed(1) : "—"}
                      </p>
                      {est.reviewCount > 0 && <Star
                        size={10}
                        className="mb-0.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />}
                    </div>
                    <p className="text-[10px] leading-tight text-slate-500">
                      nota média
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-center">
                    <div
                      className={cn(
                        "rounded text-lg font-bold tabular-nums",
                        est.reviewCount > 0 ? scoreColor(est.satisfactionScore) : "text-slate-400",
                      )}
                    >
                      {est.reviewCount > 0 ? `${est.satisfactionScore.toFixed(0)}%` : "—"}
                    </div>
                    <p className="text-[10px] leading-tight text-slate-500">
                      satisfação
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`Satisfação de ${est.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={est.reviewCount > 0 ? est.satisfactionScore : 0}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        est.satisfactionScore >= 70
                          ? "bg-green-500"
                          : est.satisfactionScore >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${est.reviewCount > 0 ? Math.min(100, Math.max(0, est.satisfactionScore)) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="mb-4 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                    <Clock3 size={13} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Última atualização: {formatUpdateDate(est.lastMiningSuccessAt)}
                    </span>
                </div>

                <div className="mb-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-500">
                  <div className="flex justify-between gap-3">
                    <span>Última tentativa</span>
                    <span className="text-right font-medium text-slate-700">{formatUpdateDate(est.lastMiningAt)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Novas na coleta</span>
                    <span className="font-semibold tabular-nums text-slate-700">{est.lastNewReviews ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Próxima coleta</span>
                    <span className="text-right font-medium text-slate-700">{est.automaticUpdatesEnabled ? (est.nextMiningAt ? formatUpdateDate(est.nextMiningAt) : "Aguardando") : "Pausada"}</span>
                  </div>
                </div>
                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => handleRefresh(est)}
                    disabled={refreshingId === est.id}
                    className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Buscar avaliações novas agora"
                  >
                    <RefreshCw
                      size={14}
                      className={refreshingId === est.id ? "animate-spin" : ""}
                      aria-hidden="true"
                    />
                    {est.lastMiningStatus === "QUEUED" || est.lastMiningStatus === "RUNNING" ? "Acompanhar mineração" : "Atualizar agora"}
                  </button>
                  <button
                    onClick={() => handleDelete(est)}
                    disabled={deletingId === est.id}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-500 transition hover:border-red-200 hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                    title="Excluir estabelecimento"
                    aria-label={`Excluir ${est.name}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateEstablishmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isLoading={isCreating}
      />

      <MiningProgressModal
        jobId={miningJobId}
        establishmentName={miningEstName}
        onComplete={handleMiningComplete}
        onDismiss={() => {
          setMiningJobId(null);
          setRefreshingId(null);
          void loadEstablishments();
        }}
        onError={(message) => {
          setMiningJobId(null);
          setRefreshingId(null);
          toast.error(message || "Falha na mineração.");
          loadEstablishments();
        }}
      />
    </>
  );
}
