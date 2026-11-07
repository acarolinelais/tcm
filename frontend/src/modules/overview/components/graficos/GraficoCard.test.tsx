import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { GraficoCard } from "./GraficoCard";
import { estadoDe } from "../../hooks/useOverviewGraficos";

it("pronto: o título nomeia o cartão e o resumo fica para o leitor de tela (CA-09)", () => {
  render(<GraficoCard titulo="Pass Rate by model" resumo="SAMSUNG S26 75%." estado="pronto" onRetry={vi.fn()}><p>gráfico</p></GraficoCard>);

  expect(screen.getByRole("region", { name: "Pass Rate by model" })).toBeInTheDocument();
  expect(screen.getByText("SAMSUNG S26 75%.")).toHaveClass("sr-only");
  expect(screen.getByText("gráfico")).toBeInTheDocument();
});

it("falha: com erro mostra a mensagem e o tentar de novo, sem o gráfico (CA-12)", async () => {
  const onRetry = vi.fn();
  render(<GraficoCard titulo="Burndown" resumo="" estado="erro" onRetry={onRetry}><p>gráfico</p></GraficoCard>);

  expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this chart.");
  expect(screen.queryByText("gráfico")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(onRetry).toHaveBeenCalledOnce();
});

it("vazio: mostra o estado vazio do próprio cartão, com o texto dele quando houver", () => {
  render(<GraficoCard titulo="Pass Rate" resumo="" estado="vazio" onRetry={vi.fn()} vazio={{ titulo: "No Form Factor round yet", dica: "Later." }}><p>gráfico</p></GraficoCard>);

  expect(screen.getByRole("heading", { name: "No Form Factor round yet" })).toBeInTheDocument();
  expect(screen.queryByText("gráfico")).not.toBeInTheDocument();
});

it("estadoDe: erro e carregando vêm antes do vazio; consulta sem dados ainda carrega", () => {
  expect(estadoDe({ isPending: true, isError: false }, true)).toBe("carregando");
  expect(estadoDe({ isPending: false, isError: true }, true)).toBe("erro");
  expect(estadoDe({ isPending: false, isError: false }, true)).toBe("vazio");
  expect(estadoDe({ isPending: false, isError: false }, false)).toBe("pronto");
});
