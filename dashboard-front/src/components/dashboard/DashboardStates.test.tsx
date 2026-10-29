import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { useReviews } from "../../hooks/useReviews";
import { EMPTY_REVIEW_STATS } from "../../services/reviewService";
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
