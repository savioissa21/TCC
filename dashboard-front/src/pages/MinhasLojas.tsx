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
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { EditorialLabel } from "../components/ui/editorial";
import { pageReveal, staggerContainer, staggerItem } from "../lib/motion";

const MINING_LABELS: Record<string, string> = {
  QUEUED: "Na fila", RUNNING: "Em execução", COMPLETED: "Concluída", FAILED: "Falhou",
};

const MINING_STYLES: Record<string, { badge: string; dot: string }> = {
  QUEUED: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  RUNNING: { badge: "bg-sky-50 text-sky-800 ring-sky-200", dot: "animate-pulse bg-sky-500" },
  COMPLETED: { badge: "bg-evergreen/10 text-evergreen ring-evergreen/20", dot: "bg-evergreen" },
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
          googleRating: null,
          googleReviewCount: null,
          googleRatingUpdatedAt: null,
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
      <motion.div initial="hidden" animate="visible" variants={pageReveal} className="space-y-7 pb-12">
        <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <EditorialLabel><Sparkles size={12} aria-hidden="true" /> Monitoramento contínuo</EditorialLabel>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-ink sm:text-4xl">
              Minhas Lojas
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {establishments.length} estabelecimento
              {establishments.length !== 1 ? "s" : ""} monitorado
              {establishments.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="w-full gap-2 sm:w-auto">
            <Plus size={16} aria-hidden="true" /> Nova Loja
          </Button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Acompanhe coletas, volume de avaliações e atualização semanal.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadEstablishments()}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
            Atualizar status
          </Button>
        </div>
        {loadError && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-sm">
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
                className="h-[430px] animate-pulse rounded-[1.25rem] border border-border bg-surface shadow-editorial"
              />
            ))}
          </div>
        ) : establishments.length === 0 && !loadError ? (
          <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-border bg-surface/70 px-6 py-20 text-center shadow-editorial">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-evergreen/10">
              <Store size={22} className="text-evergreen" />
            </div>
            <p className="font-black tracking-[-0.02em] text-ink">
              Nenhum estabelecimento cadastrado
            </p>
            <p className="mb-6 mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Cadastre sua primeira loja para começar a monitorar avaliações.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus size={14} /> Adicionar Loja
            </Button>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {establishments.map((est) => (
              <motion.article
                key={est.id}
                variants={staggerItem}
                className="group flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-border bg-surface shadow-editorial transition duration-300 ease-editorial hover:-translate-y-1 hover:border-evergreen/25 hover:shadow-lift"
              >
                <div className="flex items-start justify-between border-b border-border px-5 py-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink shadow-sm">
                      <Store size={18} className="text-surface" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-black leading-tight tracking-[-0.02em] text-ink" title={est.name}>
                        {est.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {getMapsHostname(est.mapsUrl)}
                      </p>
                    </div>
                  </div>
                  <a
                    href={est.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${est.name} no Google Maps`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-ink"
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4">
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
                        : "bg-marble text-muted-foreground hover:bg-accent",
                    )}
                    title="Ativar ou pausar a atualização semanal"
                  >
                    {est.automaticUpdatesEnabled ? "Semanal ativa" : "Pausada"}
                  </button>
                </div>
                {est.lastMiningStatus === "FAILED" && <p role="alert" className="mx-5 mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  <span>{est.lastMiningMessage}</span>
                </p>}
                {est.lastMiningMessage?.startsWith("Coleta parcial:") &&
                  <p role="status" className="mx-5 mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                    <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{est.lastMiningMessage}</span>
                  </p>}
                <div className="grid grid-cols-3 gap-2 px-5 pt-4">
                  <div className="rounded-xl border border-border bg-marble/70 p-2.5 text-center">
                    <p className="text-lg font-black tabular-nums text-ink">
                      {est.reviewCount}
                    </p>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      comentários analisados
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-marble/70 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <p className="text-lg font-black tabular-nums text-ink">
                        {est.googleRating !== null ? est.googleRating.toFixed(1) : "—"}
                      </p>
                      {est.googleRating !== null && <Star
                        size={10}
                        className="mb-0.5 fill-amber-400 text-amber-400"
                        aria-hidden="true"
                      />}
                    </div>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      nota no Google
                    </p>
                    <p className="mt-0.5 text-[9px] leading-tight text-muted-foreground/80">
                      {est.googleReviewCount !== null
                        ? `${est.googleReviewCount.toLocaleString("pt-BR")} no Maps`
                        : "aguardando coleta"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-marble/70 p-2.5 text-center">
                    <div
                      className={cn(
                        "rounded text-lg font-bold tabular-nums",
                        est.reviewCount > 0 ? scoreColor(est.satisfactionScore) : "text-muted-foreground",
                      )}
                    >
                      {est.reviewCount > 0 ? `${est.satisfactionScore.toFixed(0)}%` : "—"}
                    </div>
                    <p className="text-[10px] leading-tight text-muted-foreground">
                      satisfação textual
                    </p>
                  </div>
                </div>

                <div className="px-5 pt-4">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-marble"
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
                          ? "bg-evergreen"
                          : est.satisfactionScore >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${est.reviewCount > 0 ? Math.min(100, Math.max(0, est.satisfactionScore)) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex min-w-0 items-center gap-1.5 px-5 pt-4 text-xs text-muted-foreground">
                    <Clock3 size={13} className="shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      Última atualização: {formatUpdateDate(est.lastMiningSuccessAt)}
                    </span>
                </div>

                <div className="mx-5 my-4 space-y-2 rounded-xl border border-border bg-marble/60 p-3 text-xs text-muted-foreground">
                  <div className="flex justify-between gap-3">
                    <span>Última tentativa</span>
                    <span className="text-right font-bold text-ink/75">{formatUpdateDate(est.lastMiningAt)}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Novas na coleta</span>
                    <span className="font-bold tabular-nums text-ink/75">{est.lastNewReviews ?? 0}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>Próxima coleta</span>
                    <span className="text-right font-bold text-ink/75">{est.automaticUpdatesEnabled ? (est.nextMiningAt ? formatUpdateDate(est.nextMiningAt) : "Aguardando") : "Pausada"}</span>
                  </div>
                </div>
                <div className="mt-auto flex gap-2 border-t border-border px-5 py-4">
                  <Button
                    onClick={() => handleRefresh(est)}
                    disabled={refreshingId === est.id}
                    size="sm"
                    className="flex-1 gap-1.5"
                    title="Buscar avaliações novas agora"
                  >
                    <RefreshCw
                      size={14}
                      className={refreshingId === est.id ? "animate-spin" : ""}
                      aria-hidden="true"
                    />
                    {est.lastMiningStatus === "QUEUED" || est.lastMiningStatus === "RUNNING" ? "Acompanhar mineração" : "Atualizar agora"}
                  </Button>
                  <Button
                    onClick={() => handleDelete(est)}
                    disabled={deletingId === est.id}
                    variant="destructive"
                    size="icon"
                    className="min-h-9 h-9 w-9 shrink-0 bg-red-50 text-red-600 shadow-none hover:bg-red-100"
                    title="Excluir estabelecimento"
                    aria-label={`Excluir ${est.name}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </motion.div>

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
