import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { useReviews } from "../../hooks/useReviews";
import { EMPTY_REVIEW_STATS } from "../../services/reviewService";
import type { EstablishmentSummary } from "../../types";
import { EstablishmentSelector } from "./EstablishmentSelector";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { ReviewFeed } from "./ReviewFeed";
import { StatsGridSkeleton } from "./StatsGrid";

function feed(overrides: Partial<ReturnType<typeof useReviews>> = {}): ReturnType<typeof useReviews> {
  return {
    reviews: [],
    result: { content: [], number: 0, size: 8, totalElements: 0, totalPages: 0, last: true },
    page: 0,
    filter: "Todos",
    search: "",
    isLoading: false,
    error: null,
    fetchReviews: vi.fn(),
    changeFilter: vi.fn(),
    changeSearch: vi.fn(),
    changePage: vi.fn(),
    ...overrides,
  };
}

it("orienta o próximo passo quando ainda não existem avaliações", () => {
  render(<ReviewFeed feed={feed()} stats={EMPTY_REVIEW_STATS} onAddStore={vi.fn()} />);

  expect(screen.getByText("Sua primeira análise começa com uma loja")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cadastrar primeira loja" })).toBeInTheDocument();
});

it("mantém três indicadores durante o carregamento", () => {
  render(<StatsGridSkeleton />);
  expect(screen.getByRole("status", { name: "Carregando indicadores" }).querySelectorAll('[data-skeleton="metric"]')).toHaveLength(3);
});

it("oferece nova tentativa quando o feed falha", () => {
  render(<ReviewFeed feed={feed({ error: "Falha de rede" })} stats={EMPTY_REVIEW_STATS} onAddStore={vi.fn()} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Falha de rede");
  expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
});

it("mantém seletor e leitura executiva no mesmo escopo", async () => {
  const user = userEvent.setup();
  const stores: EstablishmentSummary[] = [
    {
      id: 1, name: "Loja Centro", mapsUrl: "https://maps.google.com/1",
      reviewCount: 20, avgRating: 4.5, googleRating: 4.6, googleReviewCount: 50,
      googleRatingUpdatedAt: null, satisfactionScore: 75, automaticUpdatesEnabled: true,
      lastMiningAt: null, lastMiningSuccessAt: null, nextMiningAt: null, lastNewReviews: 2,
      lastMiningStatus: "COMPLETED", lastMiningMessage: "Concluída",
    },
    {
      id: 2, name: "Loja Sul", mapsUrl: "https://maps.google.com/2",
      reviewCount: 30, avgRating: 4.2, googleRating: 4.4, googleReviewCount: 50,
      googleRatingUpdatedAt: null, satisfactionScore: 70, automaticUpdatesEnabled: true,
      lastMiningAt: null, lastMiningSuccessAt: null, nextMiningAt: null, lastNewReviews: 1,
      lastMiningStatus: "COMPLETED", lastMiningMessage: "Concluída",
    },
  ];

  function DecisionSurface() {
    const [selectedId, setSelectedId] = useState<number | undefined>();
    const scopedStores = stores.filter((store) => selectedId === undefined || store.id === selectedId);
    const total = selectedId === 1 ? 20 : selectedId === 2 ? 30 : 50;
    return (
      <>
        <EstablishmentSelector stores={stores} selectedId={selectedId} onChange={setSelectedId} />
        <ExecutiveSummary stats={{ ...EMPTY_REVIEW_STATS, total }} stores={scopedStores} isLoading={false} />
      </>
    );
  }

  render(<DecisionSurface />);
  expect(screen.getByRole("combobox", { name: "Estabelecimento" })).toHaveTextContent("Todas as lojas");
  expect(screen.getByRole("region", { name: "Leitura executiva" })).toHaveTextContent("50 comentários analisados");

  await user.click(screen.getByRole("combobox", { name: "Estabelecimento" }));
  await user.click(screen.getByRole("option", { name: /Loja Centro/ }));

  expect(screen.getByRole("combobox", { name: "Estabelecimento" })).toHaveTextContent("Loja Centro");
  expect(screen.getByRole("region", { name: "Leitura executiva" })).toHaveTextContent("20 comentários analisados");
});
