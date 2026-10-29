import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useReviews } from "../hooks/useReviews";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { EMPTY_REVIEW_STATS, reviewService } from "../services/reviewService";
import { establishmentService } from "../services/establishmentService";
import { type ReviewStats, type EstablishmentSummary } from "../types";

import { DashboardHeader } from "../components/dashboard/DashboardHeader";
import { EstablishmentSelector } from "../components/dashboard/EstablishmentSelector";
import { ExecutiveSummary } from "../components/dashboard/ExecutiveSummary";
import { StatsGrid, StatsGridSkeleton } from "../components/dashboard/StatsGrid";
import { ReviewFeed } from "../components/dashboard/ReviewFeed";
import { CreateEstablishmentModal } from "../components/modals/CreateEstablishmentModal";
import { MiningProgressModal } from "../components/modals/MiningProgressModal";
import { Building2 } from "lucide-react";
import { motion } from "framer-motion";
import { pageReveal, staggerContainer, staggerItem } from "../lib/motion";
import { Surface } from "../components/ui/editorial";

const InsightsSidebar = lazy(() =>
  import("../components/dashboard/InsightsSidebar").then((module) => ({
    default: module.InsightsSidebar,
  })),
);

function InsightsSkeleton() {
  return (
    <aside
      aria-label="Carregando análises"
      className="space-y-4 lg:col-span-3"
    >
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-48 animate-pulse rounded-[1.1rem] border border-border/80 bg-surface/75 shadow-editorial"
        />
      ))}
    </aside>
  );
}

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
  const selectedEstablishment = establishments.find(
    (store) => store.id === selectedStore,
  );
  const scopedEstablishments = establishments.filter(
    (store) => selectedStore === undefined || store.id === selectedStore,
  );

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

  function handleStoreChange(id?: number) {
    if (id === selectedStore) return;
    setIsLoading(true);
    setStats(EMPTY_REVIEW_STATS);
    setSelectedStore(id);
    fetchReviews();
  }

  return (
    <>
      <motion.div className="space-y-7 pb-12" initial="hidden" animate="visible" variants={staggerContainer}>
        <motion.div variants={pageReveal}>
        <DashboardHeader
          userName={user?.name?.split(" ")[0]}
          isLoading={isLoading}
          onRefresh={loadData}
          onNewStore={() => setIsCreateOpen(true)}
        />
        </motion.div>

        <motion.div variants={staggerItem} className="relative z-30">
        <Surface
          as="section"
          aria-label="Escopo dos indicadores"
          className="flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex min-w-0 shrink-0 items-center gap-3 text-sm font-bold text-ink">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-evergreen">
              <Building2 size={16} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-evergreen">Escopo da análise</span>
              <span className="mt-1 block truncate text-sm font-bold text-ink">
                {selectedEstablishment
                  ? `Dados de ${selectedEstablishment.name}`
                  : "Visão consolidada de todas as lojas"}
              </span>
            </span>
          </div>
          <EstablishmentSelector
            stores={establishments}
            selectedId={selectedStore}
            onChange={handleStoreChange}
          />
        </Surface>
        </motion.div>
        {establishments.filter(store => (selectedStore === undefined || store.id === selectedStore)
          && store.lastMiningMessage?.startsWith("Coleta parcial:")).map(store => (
          <p key={store.id} role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 shadow-sm">
            <strong>{store.name}:</strong> {store.lastMiningMessage}
          </p>
        ))}
        <motion.div variants={staggerItem} key={`summary-${selectedStore ?? "all"}-${isLoading}`}>
          <ExecutiveSummary stats={stats} stores={scopedEstablishments} isLoading={isLoading} />
        </motion.div>
        <motion.div variants={staggerItem} key={`stats-${selectedStore ?? "all"}-${isLoading}`}>
          {isLoading ? <StatsGridSkeleton /> :
            <StatsGrid stats={stats} establishments={scopedEstablishments} />}
        </motion.div>

        <motion.div variants={staggerItem} className="grid gap-7 lg:grid-cols-7">
          <ReviewFeed
            feed={feed}
            stats={stats}
            onAddStore={() => setIsCreateOpen(true)}
          />
          {isLoading ? (
            <InsightsSkeleton />
          ) : (
            <Suspense fallback={<InsightsSkeleton />}>
              <InsightsSidebar stats={stats} />
            </Suspense>
          )}
        </motion.div>
      </motion.div>

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
        onDismiss={() => { setMiningJobId(null); }}
      />
    </>
  );
}
