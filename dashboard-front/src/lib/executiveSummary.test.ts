import { describe, expect, it } from "vitest";
import type { EstablishmentSummary, ReviewStats } from "../types";
import { buildExecutiveSummary } from "./executiveSummary";

const stats: ReviewStats = {
  total: 40,
  positive: 24,
  negative: 12,
  neutral: 4,
  avgRating: 4.1,
  score: 60,
  aspects: [
    { name: "Atendimento", positive: 8, negative: 4, neutral: 0, total: 12, score: 67 },
    { name: "Ambiente", positive: 3, negative: 7, neutral: 0, total: 10, score: 30 },
    { name: "Preço", positive: 1, negative: 3, neutral: 0, total: 4, score: 25 },
  ],
};

function store(overrides: Partial<EstablishmentSummary> = {}): EstablishmentSummary {
  return {
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
    ...overrides,
  };
}

describe("buildExecutiveSummary", () => {
  it("escolhe como prioridade somente o pior aspecto com base confiável", () => {
    expect(buildExecutiveSummary(stats, [store()]).priority).toEqual({
      aspect: "Ambiente",
      score: 30,
      mentions: 10,
    });
  });

  it("não aponta prioridade quando nenhum aspecto atinge dez menções", () => {
    const sparse = { ...stats, aspects: stats.aspects.map(aspect => ({ ...aspect, total: 9 })) };
    expect(buildExecutiveSummary(sparse, [store()]).priority).toBeNull();
  });

  it("calcula cobertura indicativa sem ultrapassar cem por cento", () => {
    expect(buildExecutiveSummary(stats, [store({ googleReviewCount: 50 })]).coverage).toEqual({
      analyzed: 40,
      googleTotal: 50,
      percent: 80,
    });

    expect(buildExecutiveSummary({ ...stats, total: 80 }, [store({ googleReviewCount: 50 })]).coverage.percent).toBe(100);
  });

  it("omite percentual quando o Google não informa um total positivo", () => {
    expect(buildExecutiveSummary(stats, [store({ googleReviewCount: null })]).coverage).toEqual({
      analyzed: 40,
      googleTotal: null,
      percent: null,
    });
    expect(buildExecutiveSummary(stats, [store({ googleReviewCount: 0 })]).coverage.percent).toBeNull();
  });

  it("soma novas avaliações e mantém somente a coleta válida mais recente", () => {
    const result = buildExecutiveSummary(stats, [
      store({ id: 1, lastNewReviews: 3, lastMiningSuccessAt: "2026-10-25T10:00:00Z" }),
      store({ id: 2, lastNewReviews: 5, lastMiningSuccessAt: "2026-10-28T09:30:00Z" }),
      store({ id: 3, lastNewReviews: -2, lastMiningSuccessAt: "data-inválida" }),
    ]);

    expect(result.recentMovement).toEqual({
      newReviews: 8,
      latestSuccessAt: "2026-10-28T09:30:00Z",
    });
  });

  it("retorna estado neutro quando não existe coleta concluída", () => {
    expect(buildExecutiveSummary(stats, [store({ lastNewReviews: 0, lastMiningSuccessAt: null })]).recentMovement).toEqual({
      newReviews: 0,
      latestSuccessAt: null,
    });
  });
});
