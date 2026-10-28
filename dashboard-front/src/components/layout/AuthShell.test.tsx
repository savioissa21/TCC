import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AuthShell } from "./AuthShell";

it("organiza a autenticação em um único conteúdo principal", () => {
  render(
    <AuthShell
      eyebrow="Acesso seguro"
      title="Bem-vindo de volta"
      description="Entre para acompanhar a voz dos seus clientes."
      footer={<a href="/register">Criar conta</a>}
    >
      <form aria-label="Entrar"><input aria-label="Email" /></form>
    </AuthShell>,
  );

  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("form", { name: "Entrar" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Criar conta" })).toBeInTheDocument();
});
