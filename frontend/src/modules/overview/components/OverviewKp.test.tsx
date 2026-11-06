import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewProjeto, OverviewTime } from "../model/overview";
import { OverviewKp } from "./OverviewKp";

vi.mock("../api/overview.api", () => ({ overviewApi: { obterTime: vi.fn(), obterProjeto: vi.fn() } }));
const perfil = { id: "kp", nome: "Kaique", unidade_id: "u", perfil_codigo: "KP", permissoes: [] } as unknown as PerfilAtual;

const time: OverviewTime = {
  projetos: [{ id: "p1", nome: "Alarm 2.0", app: "Alarm" }, { id: "p2", nome: "Clock 9.5", app: "Clock" }],
  criacaoPorDia: [{ projetoId: "p1", projeto: "Alarm 2.0", media: 0.5 }, { projetoId: "p2", projeto: "Clock 9.5", media: 0 }],
  concluidosPorDev: [{ usuarioId: "u1", nome: "Ana", concluidos: 3 }, { usuarioId: "u2", nome: "Bia", concluidos: 0 }],
  concluidosPorSemana: [{ semana: "2026-10-26", concluidos: 1 }, { semana: "2026-11-02", concluidos: 2 }],
  donePorProjeto: [{ projetoId: "p1", projeto: "Alarm 2.0", concluidos: 4, total: 9, emAndamento: 0 }, { projetoId: "p2", projeto: "Clock 9.5", concluidos: 0, total: 3, emAndamento: 0 }],
  andamentoPorTime: [],
  andamentoPorSetor: [],
  emCorrecaoPorProjeto: [],
  passRatePorProjeto: [],
};
const projeto = (passRate: OverviewProjeto["passRate"]): OverviewProjeto => ({
  burndown: [{ dia: "2026-11-04", planejado: 20, executado: 20 }, { dia: "2026-11-05", planejado: 18, executado: 19 }],
  passRate,
});
const comRodada = projeto({ rodadaEm: "2026-11-01T12:00:00Z", modelos: [{ modeloId: "m1", modelo: "SAMSUNG S26", aprovados: 3, total: 4 }] });

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewKp />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
const cartao = (nome: string) => screen.findByRole("region", { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(overviewApi.obterTime).mockResolvedValue(time);
  vi.mocked(overviewApi.obterProjeto).mockResolvedValue(comRodada);
});

it("abre no primeiro projeto e resume cada gráfico em texto", async () => {
  abrir();

  expect(await within(await cartao("Pass Rate by model")).findByText("Latest Form Factor round: SAMSUNG S26 75%.")).toBeInTheDocument();
  expect(overviewApi.obterProjeto).toHaveBeenCalledWith("p1");
  expect(within(await cartao("Planned vs. executed")).getByText("19 Test Cases still open today, against 18 planned.")).toBeInTheDocument();
  expect(within(await cartao("Finished per developer")).getByText("Ana 3 and Bia 0.")).toBeInTheDocument();
  expect(within(await cartao("Done per project")).getByText("Alarm 2.0 44% and Clock 9.5 0%.")).toBeInTheDocument();
  expect(within(await cartao("Finished per week")).getByText("3 Test Cases in the last 12 weeks, 2 this week.")).toBeInTheDocument();
});

it("trocar de projeto refaz o burndown e o Pass Rate com o projeto escolhido (CA-02)", async () => {
  const user = userEvent.setup();
  abrir();

  await user.click(await screen.findByRole("button", { name: "Alarm 2.0" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "Clock 9.5" }));

  expect(overviewApi.obterProjeto).toHaveBeenLastCalledWith("p2");
  expect(await screen.findByRole("button", { name: "Clock 9.5" })).toBeInTheDocument();
});

it("falha: projeto sem rodada mostra o Pass Rate vazio e mantém os outros gráficos (CA-10)", async () => {
  vi.mocked(overviewApi.obterProjeto).mockResolvedValue(projeto(null));
  abrir();

  expect(await within(await cartao("Pass Rate by model")).findByRole("heading", { name: "No Form Factor round yet" })).toBeInTheDocument();
  expect(within(await cartao("Planned vs. executed")).getByText("19 Test Cases still open today, against 18 planned.")).toBeInTheDocument();
});

it("falha: com erro na API, cada cartão mostra a mensagem e o tentar de novo (CA-12)", async () => {
  vi.mocked(overviewApi.obterTime).mockRejectedValue(new Error("offline"));
  abrir();

  const erros = await screen.findAllByRole("alert");
  expect(erros.length).toBeGreaterThanOrEqual(4);
  expect(erros[0]).toHaveTextContent("Couldn't load this chart.");
  await userEvent.click(screen.getAllByRole("button", { name: "Try again" })[0]);
  expect(overviewApi.obterTime).toHaveBeenCalledTimes(2);
});

it("falha: sem projeto no escopo, o lugar do burndown e do Pass Rate explica que não há projetos", async () => {
  vi.mocked(overviewApi.obterTime).mockResolvedValue({ ...time, projetos: [], criacaoPorDia: [], donePorProjeto: [] });
  abrir();

  expect(await screen.findByRole("heading", { name: "No projects to show" })).toBeInTheDocument();
  expect(overviewApi.obterProjeto).not.toHaveBeenCalled();
});
