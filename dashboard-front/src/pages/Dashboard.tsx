import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { reviewService } from "../services/reviewService";
import { establishmentService } from "../services/establishmentService";
import { type Review, type EstablishmentSummary } from "../types";

import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { StatsGrid } from "../components/dashboard/StatsGrid";
import { ReviewFeed } from "../components/dashboard/ReviewFeed";
import { InsightsSidebar } from "../components/dashboard/InsightsSidebar";
import { CreateEstablishmentModal } from "../components/modals/CreateEstablishmentModal";
import { MiningProgressModal } from "../components/modals/MiningProgressModal";

export function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [establishments, setEstablishments] = useState<EstablishmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal de criação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Modal de progresso de mineração
  const [miningJobId, setMiningJobId] = useState<string | null>(null);
  const [miningEstName, setMiningEstName] = useState("");

  async function loadData() {
    setIsLoading(true);
    try {
      const [rev, est] = await Promise.all([
        reviewService.getAll(),
        establishmentService.getAll(),
      ]);
      setReviews(rev);
      setEstablishments(est);
    } catch {
      toast.error("Não foi possível carregar os dados.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreateEstablishment(data: { name: string; url: string }) {
    setIsCreating(true);
    try {
      const { establishment, jobId } = await establishmentService.create(data);
      setIsCreating(false);
      setIsCreateOpen(false);
      setMiningEstName(establishment.name);
      setMiningJobId(jobId);
      toast.info("Mineração iniciada! A IA está analisando as avaliações.");
      // Atualiza a lista de estabelecimentos imediatamente
      setEstablishments((prev) => [...prev, { id: establishment.id, name: establishment.name, mapsUrl: establishment.mapsUrl, reviewCount: 0, avgRating: 0, satisfactionScore: 0 }]);
    } catch (err: any) {
      setIsCreating(false);
      toast.error(err?.response?.data?.error || "Erro ao criar estabelecimento.");
    }
  }

  function handleMiningComplete() {
    setMiningJobId(null);
    toast.success(`Mineração de "${miningEstName}" concluída! Atualizando dados...`);
    loadData();
  }

  function handleMiningError() {
    setMiningJobId(null);
    toast.error("A mineração falhou. Verifique os logs do servidor.");
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

        <StatsGrid reviews={reviews} establishments={establishments} />

        <div className="grid gap-6 lg:grid-cols-7">
          <ReviewFeed
            reviews={reviews}
            isLoading={isLoading}
            onAddStore={() => setIsCreateOpen(true)}
          />
          <InsightsSidebar reviews={reviews} />
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
