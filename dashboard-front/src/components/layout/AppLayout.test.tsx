import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./AppLayout";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { name: "Arthur Silva", email: "arthur@example.com" },
    signOut: vi.fn(),
  }),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<h1>Painel de teste</h1>} />
          <Route path="/minhas-lojas" element={<h1>Lojas de teste</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("moldura do aplicativo", () => {
  it("nomeia a navegação principal e mantém o conteúdo em um landmark", () => {
    renderLayout();

    expect(screen.getByRole("navigation", { name: "Navegação principal" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Painel de teste");
  });

  it("fecha o menu móvel com Escape e devolve o foco ao acionador", () => {
    renderLayout();
    const trigger = screen.getByRole("button", { name: "Abrir menu" });
    trigger.focus();
    fireEvent.click(trigger);

    const mobileNavigation = screen.getByRole("navigation", { name: "Navegação móvel" });
    fireEvent.keyDown(mobileNavigation.parentElement as HTMLElement, { key: "Escape" });

    expect(screen.queryByRole("navigation", { name: "Navegação móvel" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
