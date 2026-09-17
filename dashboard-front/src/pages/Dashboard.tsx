import { useCallback, useEffect, useRef, useState } from "react";
import { useReviews } from "../hooks/useReviews";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { EMPTY_REVIEW_STATS, reviewService } from "../services/reviewService";
import { establishmentService } from "../services/establishmentService";
import { type ReviewStats, type EstablishmentSummary } from "../types";

import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { ReviewFeed } from "../components/dashboard/ReviewFeed";
import { InsightsSidebar } from "../components/dashboard/InsightsSidebar";
import { CreateEstablishmentModal } from "../components/modals/CreateEstablishmentModal";
import { MiningProgressModal } from "../components/modals/MiningProgressModal";

export function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [selectedStore, setSelectedStore] = useState<number | undefined>();
  const [revision, setRevision] = useState(0);
  const feed = useReviews(selectedStore);
  const { fetchReviews } = feed;
  const [stats, setStats] = useState<ReviewStats>(EMPTY_REVIEW_STATS);
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  const [establishments, setEstablishments] = useState<EstablishmentSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal de progresso de mineração
  const [miningJobId, setMiningJobId] = useState<string | null>(null);
  const [miningEstName, setMiningEstName] = useState("");

  const loadData = useCallback(async () => {
    fetchReviews();
    setIsLoading(true);
    setRevision(value => value + 1);
    try {
      setEstablishments(await establishmentService.getAll());
    } catch {
      toastRef.current.error("Não foi possível carregar as lojas.");
    }
  }, [fetchReviews]);

  useEffect(() => {
    const controller = new AbortController();
    void reviewService.getStats(selectedStore, controller.signal).then(summary => {
      if (!controller.signal.aborted) setStats(summary);
    }).catch(() => {
      if (!controller.signal.aborted) toastRef.current.error("Não foi possível carregar os indicadores.");
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false);
    });
    return () => controller.abort();
  }, [selectedStore, revision]);

  useEffect(() => {
    let active = true;
    void establishmentService.getAll().then(stores => {
      if (active) setEstablishments(stores);
    }).catch(() => {
      if (active) toastRef.current.error("Não foi possível carregar as lojas.");
    });
    return () => { active = false; };
  }, []);

  async function handleCreateEstablishment(data: {
    name: string;
    url: string;
  }) {
    setIsCreating(true);
    try {
      const { establishment, jobId } = await establishmentService.create(data);
      setIsCreating(false);
      setIsCreateOpen(false);
      setMiningEstName(establishment.name);
      setMiningJobId(jobId);
      setSelectedStore(establishment.id);
      setStats(EMPTY_REVIEW_STATS);
      setIsLoading(true);
      fetchReviews();
      toast.info("Mineração iniciada! A IA está analisando as avaliações.");
      // Atualiza a lista de estabelecimentos imediatamente
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

  function handleMiningComplete(message?: string) {
    setMiningJobId(null);
    if (message?.startsWith("Coleta parcial:")) toast.info(message);
    else toast.success(
      `Mineração de "${miningEstName}" concluída! Atualizando dados...`,
    );
    loadData();
  }

  function handleMiningError(message?: string) {
    setMiningJobId(null);
    toast.error(
      message || "A mineração falhou. Verifique os logs do servidor.",
    );
  }

  return (
    <>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          isLoading={isLoading}
          onRefresh={loadData}
          onNewStore={() => setIsCreateOpen(true)}
        />

        <div className="block text-sm font-medium text-slate-700">
          <label htmlFor="dashboard-store">Estabelecimento</label>
          <select id="dashboard-store" value={selectedStore ?? "all"} onChange={event => {
            setIsLoading(true);
            setStats(EMPTY_REVIEW_STATS);
            setSelectedStore(event.target.value === "all" ? undefined : Number(event.target.value));
            fetchReviews();
          }} className="ml-3 rounded-lg border border-slate-300 bg-white p-2">
            <option value="all">Todas as lojas (visão consolidada)</option>
            {establishments.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
          </select>
        </div>
        {establishments.filter(store => (selectedStore === undefined || store.id === selectedStore)
          && store.lastMiningMessage?.startsWith("Coleta parcial:")).map(store => (
          <p key={store.id} role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <strong>{store.name}:</strong> {store.lastMiningMessage}
          </p>
        ))}
        {isLoading ? <p role="status">Carregando indicadores...</p> :
          <StatsGrid stats={stats} establishments={establishments.filter(store => selectedStore === undefined || store.id === selectedStore)} />}

        <div className="grid gap-6 lg:grid-cols-7">
          <ReviewFeed
            feed={feed}
            stats={stats}
            onAddStore={() => setIsCreateOpen(true)}
          />
          {!isLoading && <InsightsSidebar stats={stats} />}
        </div>
      </div>

      <CreateEstablishmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateEstablishment}
        isLoading={isCreating}
      />

      <MiningProgressModal
        jobId={miningJobId}
        establishmentName={miningEstName}
        onComplete={handleMiningComplete}
        onError={handleMiningError}
        onClose={() => setMiningJobId(null)}
      />
    </>
  );
}
