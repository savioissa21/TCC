import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MiningProgressModal } from "./MiningProgressModal";
import { miningService } from "../../services/miningService";

vi.mock("../../services/miningService", () => ({
  miningService: { getStatus: vi.fn() },
}));

const getStatus = vi.mocked(miningService.getStatus);

describe("MiningProgressModal", () => {
  it("sair do acompanhamento aborta apenas a consulta e não cancela o job", async () => {
    getStatus.mockResolvedValue({ state: "RUNNING", message: "Coletando", reviewsImported: 0, updatedAt: "" });
    const dismiss = vi.fn();
    const { unmount } = render(<MiningProgressModal jobId="background" establishmentName="Loja"
      onComplete={vi.fn()} onError={vi.fn()} onDismiss={dismiss} />);
    expect(await screen.findByText("Coletando")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continuar em segundo plano" }));
    expect(dismiss).toHaveBeenCalledOnce();
    const signal = getStatus.mock.calls[0][1];
    unmount();
    expect(signal?.aborted).toBe(true);
  });
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("exibe somente o estado real devolvido pelo backend", async () => {
    getStatus.mockResolvedValue({
      state: "QUEUED",
      message: "Aguardando na fila de mineração...",
      reviewsImported: 0,
      updatedAt: "2026-09-09T12:00:00",
    });

    render(
      <MiningProgressModal jobId="job-1" establishmentName="Loja"
        onComplete={vi.fn()} onError={vi.fn()} />,
    );

    expect(await screen.findByText("Aguardando na fila de mineração...")).toBeInTheDocument();
    expect(screen.queryByText("Rolando página para carregar avaliações...")).not.toBeInTheDocument();
  });

  it("limpa o resultado anterior quando recebe um novo job", async () => {
    getStatus.mockResolvedValueOnce({
      state: "COMPLETED", message: "Concluído", reviewsImported: 2,
      updatedAt: "2026-09-09T12:00:00",
    }).mockResolvedValueOnce({
      state: "RUNNING", message: "Coletando nova loja", reviewsImported: 0,
      updatedAt: "2026-09-09T12:01:00",
    });
    const onComplete = vi.fn();
    const onError = vi.fn();
    const { rerender } = render(
      <MiningProgressModal jobId="job-1" establishmentName="Loja 1"
        onComplete={onComplete} onError={onError} />,
    );
    expect(await screen.findByText("Mineração concluída!")).toBeInTheDocument();

    rerender(
      <MiningProgressModal jobId="job-2" establishmentName="Loja 2"
        onComplete={onComplete} onError={onError} />,
    );

    expect(await screen.findByText("Coletando nova loja")).toBeInTheDocument();
    expect(screen.queryByText("Mineração concluída!")).not.toBeInTheDocument();
  });

  it("encerra o acompanhamento depois de falhas de rede consecutivas", async () => {
    vi.useFakeTimers();
    getStatus.mockRejectedValue(new Error("offline"));
    const onError = vi.fn();
    render(
      <MiningProgressModal jobId="job-1" establishmentName="Loja"
        onComplete={vi.fn()} onError={onError} />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(onError).toHaveBeenCalledWith(
      "Não foi possível acompanhar a mineração. O trabalho continua salvo; consulte Minhas Lojas.",
    );
  });

  it("mantém o aviso de coleta parcial até o usuário abrir as avaliações", async () => {
    const message = "Coleta parcial: o Google limitou o acesso ou a ordenação. 5 novas; 0 já conhecidas.";
    getStatus.mockResolvedValue({ state: "COMPLETED", message, reviewsImported: 5, updatedAt: "2026-09-13T12:00:00" });
    const onComplete = vi.fn();
    render(<MiningProgressModal jobId="partial" establishmentName="Loja" onComplete={onComplete} onError={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByText("Mineração concluída!")).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Ver avaliações" }));
    expect(onComplete).toHaveBeenCalledWith(message);
  });
});
