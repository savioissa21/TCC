import { useEffect, useState } from "react";
import { useToast } from "../contexts/ToastContext";
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
} from "lucide-react";
import { cn } from "../lib/utils";

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

  async function loadEstablishments() {
    try {
      const data = await establishmentService.getAll();
      setEstablishments(data);
    } catch {
      toast.error("Não foi possível carregar os estabelecimentos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEstablishments();
  }, []);

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
          lastMiningStatus: "RUNNING",
          lastMiningMessage: "Coleta inicial em andamento.",
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

  function handleMiningComplete() {
    setMiningJobId(null);
    setRefreshingId(null);
    toast.success(`Mineração de "${miningEstName}" concluída!`);
    loadEstablishments();
  }

  async function handleRefresh(est: EstablishmentSummary) {
    setRefreshingId(est.id);
    try {
      const { jobId } = await establishmentService.refresh(est.id);
      setMiningEstName(est.name);
      setMiningJobId(jobId);
      toast.info(`Buscando novas avaliações de "${est.name}".`);
    } catch (err) {
      setRefreshingId(null);
      toast.error(err instanceof Error ? err.message : "Não foi possível atualizar a loja.");
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Minhas Lojas
            </h1>
            <p className="text-slate-500 mt-0.5 text-sm">
              {establishments.length} estabelecimento
              {establishments.length !== 1 ? "s" : ""} monitorado
              {establishments.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Plus size={14} /> Nova Loja
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 rounded-xl border border-slate-200 bg-slate-50 animate-pulse"
              />
            ))}
          </div>
        ) : establishments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-20 text-center">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
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
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
            >
              <Plus size={14} /> Adicionar Loja
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {establishments.map((est) => (
              <div
                key={est.id}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                {/* Nome */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                      <Store size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">
                        {est.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[140px]">
                        {new URL(est.mapsUrl).hostname}
                      </p>
                    </div>
                  </div>
                  <a
                    href={est.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <p className="text-lg font-bold text-slate-900">
                      {est.reviewCount}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      avaliações
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <p className="text-lg font-bold text-slate-900">
                        {est.avgRating.toFixed(1)}
                      </p>
                      <Star
                        size={10}
                        className="text-yellow-400 fill-yellow-400 mb-0.5"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      nota média
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                    <div
                      className={cn(
                        "text-lg font-bold rounded",
                        scoreColor(est.satisfactionScore),
                      )}
                    >
                      {est.satisfactionScore.toFixed(0)}%
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      satisfação
                    </p>
                  </div>
                </div>

                {/* Barra de satisfação */}
                <div className="mb-4">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        est.satisfactionScore >= 70
                          ? "bg-green-500"
                          : est.satisfactionScore >= 50
                            ? "bg-yellow-500"
                            : "bg-red-500",
                      )}
                      style={{ width: `${est.satisfactionScore}%` }}
                    />
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-1.5 text-slate-500">
                    <Clock3 size={12} className="shrink-0" />
                    <span className="truncate">
                      Última: {formatUpdateDate(est.lastMiningSuccessAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutomaticToggle(est)}
                    disabled={togglingId === est.id}
                    className={cn(
                      "shrink-0 rounded-full px-2 py-1 font-medium transition disabled:opacity-50",
                      est.automaticUpdatesEnabled
                        ? "bg-green-50 text-green-700 hover:bg-green-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200",
                    )}
                    title="Ativar ou pausar a atualização semanal"
                  >
                    {est.automaticUpdatesEnabled ? "Semanal ativa" : "Pausada"}
                  </button>
                </div>

                {/* Ações */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRefresh(est)}
                    disabled={refreshingId === est.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Buscar avaliações novas agora"
                  >
                    <RefreshCw
                      size={12}
                      className={refreshingId === est.id ? "animate-spin" : ""}
                    />
                    Atualizar agora
                  </button>
                  <button
                    onClick={() => handleDelete(est)}
                    disabled={deletingId === est.id}
                    className="rounded-lg border border-red-100 bg-red-50 p-1.5 text-red-400 hover:bg-red-100 hover:text-red-600 transition disabled:opacity-50"
                    title="Excluir estabelecimento"
                  >
                    <Trash2 size={14} />
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
