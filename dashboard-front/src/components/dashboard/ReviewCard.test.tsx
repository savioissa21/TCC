import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ReviewCard } from "./ReviewCard";
import type { Review } from "../../types";

afterEach(() => vi.restoreAllMocks());

function mockTextSize(scrollHeight: number, clientHeight: number) {
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(scrollHeight);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(clientHeight);
}

it("agrupa etiquetas repetidas e permite expandir somente um texto truncado", () => {
  mockTextSize(96, 60);
  const review: Review = { id: "r1", author: "Ana", text: "Ambiente bonito. Ambiente limpo, porém barulhento.",
    rating: 4, date: "hoje", source: "Google Maps", sentimentScore: 0.9, overallSentiment: "Positivo",
    establishmentName: "Loja A", aspects: [
      { id: 1, name: "Ambiente", sentiment: "Positivo", excerpt: "bonito" },
      { id: 2, name: "Ambiente", sentiment: "Positivo", excerpt: "limpo" },
      { id: 3, name: "Ambiente", sentiment: "Negativo", excerpt: "barulhento" },
    ] };
  render(<ReviewCard review={review} />);
  expect(screen.getAllByText("Ambiente:")).toHaveLength(2);
  expect(screen.getByTitle(/bonito\s+limpo/)).toBeInTheDocument();
  expect(screen.getByText("Loja A")).toBeInTheDocument();
  const expand = screen.getByRole("button", { name: "Ler avaliação completa" });
  fireEvent.click(expand);
  expect(expand).toHaveAttribute("aria-expanded", "true");
  expect(screen.getByText(/Ambiente bonito/)).not.toHaveClass("line-clamp-3");
});

it("não mostra a opção de expansão quando a avaliação cabe no cartão", () => {
  mockTextSize(40, 40);
  const review: Review = {
    id: "r2", author: "Bia", text: "Muito bom!", rating: 5, date: "hoje",
    source: "Google Maps", sentimentScore: 0.98, overallSentiment: "Positivo", aspects: [],
  };

  render(<ReviewCard review={review} />);

  expect(screen.queryByRole("button", { name: /ler avaliação completa/i })).not.toBeInTheDocument();
  expect(screen.getByText(/Muito bom/)).toHaveClass("line-clamp-3");
});
