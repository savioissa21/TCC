import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EstablishmentSummary, ReviewStats } from "../../types";
import { ExecutiveSummary } from "./ExecutiveSummary";

const stats: ReviewStats = {
  total: 40,
  positive: 24,
  negative: 12,
  neutral: 4,
  avgRating: 4.1,
  score: 60,
  aspects: [
    { name: "Ambiente", positive: 3, negative: 7, neutral: 0, total: 10, score: 30 },
  ],
};

const store: EstablishmentSummary = {
  id: 1,
  name: "Loja Centro",
  mapsUrl: "https://maps.google.com",
  reviewCount: 40,
  avgRating: 4.1,
  googleRating: 4.3,
  googleReviewCount: 100,
  googleRatingUpdatedAt: null,
  satisfactionScore: 60,
  automaticUpdatesEnabled: true,
  lastMiningAt: "2026-10-28T12:00:00Z",
  lastMiningSuccessAt: "2026-10-28T12:00:00Z",
  nextMiningAt: null,
  lastNewReviews: 3,
  lastMiningStatus: "COMPLETED",
  lastMiningMessage: "Concluída",
};

describe("ExecutiveSummary", () => {
  it("explica prioridade, base e movimento recente do escopo", () => {
    render(<ExecutiveSummary stats={stats} stores={[store]} isLoading={false} />);

    const summary = screen.getByRole("region", { name: "Leitura executiva" });
    expect(within(summary).getByText("Onde agir")).toBeInTheDocument();
    expect(within(summary).getByText("Ambiente")).toBeInTheDocument();
    expect(within(summary).getByText("30% positivas · 10 menções")).toBeInTheDocument();
    expect(within(summary).getByText("Base analisada")).toBeInTheDocument();
    expect(within(summary).getByText("40 comentários analisados")).toBeInTheDocument();
    expect(within(summary).getByText("40% de cobertura textual indicativa")).toBeInTheDocument();
    expect(within(summary).getByText(/pode incluir avaliações sem comentário/i)).toBeInTheDocument();
    expect(within(summary).getByText("Movimento recente")).toBeInTheDocument();
    expect(within(summary).getByText("3 novas na última coleta")).toBeInTheDocument();
  });

  it("não inventa prioridade ou cobertura quando a base é insuficiente", () => {
    render(<ExecutiveSummary
      stats={{ ...stats, total: 0, aspects: [{ ...stats.aspects[0], total: 9 }] }}
      stores={[{ ...store, googleReviewCount: null, lastMiningSuccessAt: null, lastNewReviews: 0 }]}
      isLoading={false}
    />);

    expect(screen.getByText("Base insuficiente")).toBeInTheDocument();
    expect(screen.getByText("Nenhum aspecto atingiu 10 menções.")).toBeInTheDocument();
    expect(screen.getByText("Total do Google indisponível")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma avaliação nova na última coleta")).toBeInTheDocument();
    expect(screen.getByText("Sem coleta concluída")).toBeInTheDocument();
  });

  it("mantém a geometria informativa durante o carregamento", () => {
    render(<ExecutiveSummary stats={stats} stores={[store]} isLoading />);
    expect(screen.getByRole("status", { name: "Carregando leitura executiva" })).toBeInTheDocument();
  });
});
