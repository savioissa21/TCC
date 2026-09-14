import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ReviewCard } from "./ReviewCard";
import type { Review } from "../../types";

it("agrupa etiquetas repetidas preservando polaridades opostas e permite ler o texto", () => {
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
