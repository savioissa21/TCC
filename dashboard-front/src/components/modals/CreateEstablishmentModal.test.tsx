import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateEstablishmentModal } from "./CreateEstablishmentModal";

describe("contrato de cadastro de loja", () => {
  it("rejeita nome curto e FTP; normaliza Markdown antes de enviar", () => {
    const submit = vi.fn();
    render(<CreateEstablishmentModal isOpen onClose={vi.fn()} onSubmit={submit} isLoading={false} />);
    const name = screen.getByLabelText("Nome do Estabelecimento");
    const url = screen.getByLabelText("URL do Google Maps");
    const button = screen.getByRole("button", { name: "Criar e Minerar" });
    fireEvent.change(name, { target: { value: "A" } });
    fireEvent.change(url, { target: { value: "https://maps.app.goo.gl/teste" } });
    expect(button).toBeDisabled();
    fireEvent.change(name, { target: { value: "  Loja teste  " } });
    fireEvent.change(url, { target: { value: "ftp://maps.app.goo.gl/teste" } });
    expect(button).toBeDisabled();
    fireEvent.change(url, { target: { value: "[Maps](https://maps.app.goo.gl/teste)" } });
    fireEvent.click(button);
    expect(submit).toHaveBeenCalledWith({ name: "Loja teste", url: "https://maps.app.goo.gl/teste" });
  });
  it("bloqueia URL excessiva, pesquisa e domínio externo", () => {
    render(<CreateEstablishmentModal isOpen onClose={vi.fn()} onSubmit={vi.fn()} isLoading={false} />);
    fireEvent.change(screen.getByLabelText("Nome do Estabelecimento"), { target: { value: "Teste" } });
    for (const value of ["https://maps.app.goo.gl/" + "a".repeat(2000), "https://www.google.com/maps/search/restaurante",
      "https://example.com/maps/place/teste", "https://maps.app.goo.gl/"]) {
      fireEvent.change(screen.getByLabelText("URL do Google Maps"), { target: { value } });
      expect(screen.getByRole("button", { name: "Criar e Minerar" })).toBeDisabled();
    }
  });
});
