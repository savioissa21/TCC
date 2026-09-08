import { useCallback, useEffect, useRef, useState } from "react";
import { useReviews } from "../hooks/useReviews";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
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

  const feed = useReviews();
  const { fetchReviews } = feed;
  const [stats, setStats] = useState<ReviewStats>(EMPTY_REVIEW_STATS);
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  const [establishments, setEstablishments] = useState<EstablishmentSummary[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(false);

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal de progresso de mineração
  const [miningJobId, setMiningJobId] = useState<string | null>(null);
  const [miningEstName, setMiningEstName] = useState("");

  const loadData = useCallback(async () => {
    fetchReviews();
    setIsLoading(true);
    try {
      const [summary, est] = await Promise.all([
        reviewService.getStats(),
        establishmentService.getAll(),
      ]);
      setStats(summary);
      setEstablishments(est);
    } catch {
      toastRef.current.error("Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchReviews]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  function handleMiningComplete() {
    setMiningJobId(null);
    toast.success(
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

        <StatsGrid stats={stats} establishments={establishments} />

        <div className="grid gap-6 lg:grid-cols-7">
          <ReviewFeed
            feed={feed}
            stats={stats}
            onAddStore={() => setIsCreateOpen(true)}
          />
          <InsightsSidebar stats={stats} />
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
      />
    </>
  );
}
