import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EstablishmentSummary } from "../../types";
import { EstablishmentSelector } from "./EstablishmentSelector";

const stores: EstablishmentSummary[] = [
  {
    id: 1,
    name: "Restaurante com um nome muito comprido para caber inteiro no acionador",
    mapsUrl: "https://maps.google.com/1",
    reviewCount: 49,
    avgRating: 4.7,
    googleRating: 4.8,
    googleReviewCount: 12_388,
    googleRatingUpdatedAt: "2026-10-28T12:00:00Z",
    satisfactionScore: 88,
    automaticUpdatesEnabled: true,
    lastMiningAt: "2026-10-28T12:00:00Z",
    lastMiningSuccessAt: "2026-10-28T12:00:00Z",
    nextMiningAt: null,
    lastNewReviews: 4,
    lastMiningStatus: "COMPLETED",
    lastMiningMessage: "Concluída",
  },
  {
    id: 2,
    name: "Celsin Bar e Restaurante",
    mapsUrl: "https://maps.google.com/2",
    reviewCount: 18,
    avgRating: 3.9,
    googleRating: null,
    googleReviewCount: null,
    googleRatingUpdatedAt: null,
    satisfactionScore: 61,
    automaticUpdatesEnabled: false,
    lastMiningAt: "2026-10-27T12:00:00Z",
    lastMiningSuccessAt: null,
    nextMiningAt: null,
    lastNewReviews: 0,
    lastMiningStatus: "FAILED",
    lastMiningMessage: "Falha na última coleta",
  },
];

describe("EstablishmentSelector", () => {
  it("abre uma bandeja informativa, marca o escopo e seleciona uma loja", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EstablishmentSelector stores={stores} onChange={onChange} />);

    const trigger = screen.getByRole("combobox", { name: "Estabelecimento" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveTextContent("Todas as lojas");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const listbox = screen.getByRole("listbox", { name: "Estabelecimentos" });
    const consolidated = within(listbox).getByRole("option", { name: /Todas as lojas/ });
    expect(consolidated).toHaveAttribute("aria-selected", "true");
    expect(consolidated).toHaveTextContent("2 lojas");
    expect(consolidated).toHaveTextContent("67 comentários");

    const firstStore = within(listbox).getByRole("option", { name: /Restaurante com um nome muito comprido/ });
    expect(firstStore).toHaveTextContent("49 comentários");
    expect(firstStore).toHaveTextContent("88% satisfação");
    expect(firstStore).toHaveTextContent("4,8 no Google");
    expect(firstStore.querySelector("[title]"))?.toHaveAttribute("title", stores[0].name);

    await user.click(firstStore);
    expect(onChange).toHaveBeenCalledWith(1);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("abre e percorre as opções pelo teclado antes de confirmar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EstablishmentSelector stores={stores} selectedId={1} onChange={onChange} />);

    const trigger = screen.getByRole("combobox", { name: "Estabelecimento" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");

    const firstStore = screen.getByRole("option", { name: /Restaurante com um nome muito comprido/ });
    expect(firstStore).toHaveFocus();

    await user.keyboard("{End}");
    const lastStore = screen.getByRole("option", { name: /Celsin Bar e Restaurante/ });
    expect(lastStore).toHaveFocus();

    await user.keyboard("{Home}");
    expect(screen.getByRole("option", { name: /Todas as lojas/ })).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onChange).toHaveBeenCalledWith(2);
    expect(trigger).toHaveFocus();
  });

  it("fecha com Escape ou clique externo e devolve o foco ao acionador", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <EstablishmentSelector stores={stores} selectedId={2} onChange={vi.fn()} />
        <button type="button">Fora</button>
      </div>,
    );

    const trigger = screen.getByRole("combobox", { name: "Estabelecimento" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Fora" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
