import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { StatsGrid } from "./StatsGrid";
import type { EstablishmentSummary, ReviewStats } from "../../types";

const stats: ReviewStats = {
  total: 20,
  positive: 15,
  negative: 3,
  neutral: 2,
  avgRating: 1,
  score: 75,
  aspects: [],
};

function store(id: number, googleRating: number, googleReviewCount: number): EstablishmentSummary {
  return {
    id,
    name: `Loja ${id}`,
    mapsUrl: "https://www.google.com/maps/place/Loja",
    reviewCount: 10,
    avgRating: 1,
    googleRating,
    googleReviewCount,
    googleRatingUpdatedAt: "2026-10-26T12:00:00",
    satisfactionScore: 75,
    automaticUpdatesEnabled: true,
    lastMiningAt: null,
    lastMiningSuccessAt: null,
    nextMiningAt: null,
    lastNewReviews: 0,
    lastMiningStatus: "COMPLETED",
    lastMiningMessage: null,
  };
}

it("mostra a nota oficial ponderada do Google separada da amostra textual", () => {
  render(
    <StatsGrid
      stats={stats}
      establishments={[store(1, 4.5, 100), store(2, 3.5, 100)]}
    />,
  );

  expect(screen.getByText("Nota no Google")).toBeInTheDocument();
  expect(screen.getByText("4.0")).toBeInTheDocument();
  expect(screen.getByText("200 avaliações no Google")).toBeInTheDocument();
  expect(screen.getByText("Comentários analisados")).toBeInTheDocument();
  expect(screen.queryByText("Nota Média")).not.toBeInTheDocument();
});
