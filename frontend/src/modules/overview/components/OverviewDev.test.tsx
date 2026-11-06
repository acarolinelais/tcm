import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { overviewApi } from "../api/overview.api";
import type { OverviewPessoal } from "../model/overview";
import { OverviewDev } from "./OverviewDev";

vi.mock("../api/overview.api", () => ({ overviewApi: { obterPessoal: vi.fn() } }));

const pessoal: OverviewPessoal = {
  concluidos: 2,
  atribuidos: 3,
  porDificuldade: { Low: 2, Medium: 0, High: 1 },
  entregasPorDia: [{ dia: "2026-11-04", concluidos: 1 }, { dia: "2026-11-05", concluidos: 1 }],
  entregasPorSemana: [{ semana: "2026-11-02", concluidos: 2 }],
};

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><OverviewDev /></QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

it("mostra Done contra o atribuído e os Test Cases por dificuldade (CA-08)", async () => {
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue(pessoal);
  abrir();

  const dificuldade = await screen.findByRole("region", { name: "Test Cases by difficulty" });
  expect(await within(dificuldade).findByText("Low 2, Medium 0, and High 1.")).toBeInTheDocument();
  expect(screen.getByText("2 of 3 Test Cases done.")).toBeInTheDocument();
  expect(screen.getByText("2 Test Cases delivered in the last 30 days.")).toBeInTheDocument();
});

it("sem entregas no período, os gráficos por dia e por semana mostram o próprio vazio", async () => {
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue({
    ...pessoal,
    entregasPorDia: [{ dia: "2026-11-05", concluidos: 0 }],
    entregasPorSemana: [{ semana: "2026-11-02", concluidos: 0 }],
  });
  abrir();

  const porDia = await screen.findByRole("region", { name: "Delivered per day" });
  expect(await within(porDia).findByRole("heading", { name: "Nothing to show yet" })).toBeInTheDocument();
  expect(screen.getByText("Low 2, Medium 0, and High 1.")).toBeInTheDocument();
});

it("falha: com erro na API, mostra a mensagem com o tentar de novo (CA-12)", async () => {
  vi.mocked(overviewApi.obterPessoal).mockRejectedValue(new Error("offline"));
  abrir();

  expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Couldn't load this chart.");
  expect(screen.getAllByRole("button", { name: "Try again" })).toHaveLength(4);
});
