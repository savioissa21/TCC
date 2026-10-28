import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { Sparkles } from "lucide-react";
import { EditorialLabel, MetricPanel, Surface } from "./editorial";

it("mantém rótulos e métricas compreensíveis sem depender de cor", () => {
  render(
    <>
      <EditorialLabel>Visão geral</EditorialLabel>
      <Surface as="section" aria-label="Indicadores">
        <MetricPanel
          label="Satisfação textual"
          value="88%"
          detail="49 comentários analisados"
          icon={<Sparkles aria-hidden="true" />}
          tone="positive"
        />
      </Surface>
    </>,
  );

  expect(screen.getByText("Visão geral")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Indicadores" })).toBeInTheDocument();
  expect(screen.getByRole("group", { name: "Satisfação textual" })).toHaveTextContent(
    "88%49 comentários analisados",
  );
});
