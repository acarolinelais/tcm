import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewProjeto, OverviewTime } from "../model/overview";
import { OverviewGerente } from "./OverviewGerente";

vi.mock("../api/overview.api", () => ({ overviewApi: { obterTime: vi.fn(), obterProjeto: vi.fn() } }));
const perfil = { id: "g", nome: "Ivan", unidade_id: "u", perfil_codigo: "GERENTE", permissoes: [] } as unknown as PerfilAtual;

const time: OverviewTime = {
  projetos: [{ id: "p1", nome: "Alarm 2.0", app: "Alarm" }, { id: "p2", nome: "Clock 9.5", app: "Clock" }],
  criacaoPorDia: [],
  concluidosPorDev: [],
  concluidosPorSemana: [{ semana: "2026-10-26", concluidos: 1 }, { semana: "2026-11-02", concluidos: 2 }],
  donePorProjeto: [{ projetoId: "p1", projeto: "Alarm 2.0", concluidos: 4, total: 9, emAndamento: 0 }, { projetoId: "p2", projeto: "Clock 9.5", concluidos: 0, total: 3, emAndamento: 0 }],
  andamentoPorTime: [{ id: "t1", nome: "QA", aFazer: 3, emAndamento: 4, concluidos: 5 }, { id: "t2", nome: "Site", aFazer: 1, emAndamento: 0, concluidos: 2 }],
  andamentoPorSetor: [],
  emCorrecaoPorProjeto: [{ projetoId: "p2", projeto: "Clock 9.5", emCorrecao: 3 }],
  passRatePorProjeto: [{ projetoId: "p1", projeto: "Alarm 2.0", aprovados: 8, total: 10 }],
};
const comRodada: OverviewProjeto = {
  burndown: [],
  passRate: { rodadaEm: "2026-11-01T12:00:00Z", modelos: [{ modeloId: "m1", modelo: "SAMSUNG S26", aprovados: 3, total: 4 }] },
};

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewGerente />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
const cartao = (nome: string) => screen.findByRole("region", { name: nome });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(overviewApi.obterTime).mockResolvedValue(time);
  vi.mocked(overviewApi.obterProjeto).mockResolvedValue(comRodada);
});

it("mostra o andamento de cada time, o retrabalho, o Done e o Pass Rate por projeto (CA-01 a CA-04)", async () => {
  abrir();

  expect(await within(await cartao("Progress by team")).findByText("QA: 3 to do, 4 in progress, 5 done and Site: 1 to do, 0 in progress, 2 done")).toBeInTheDocument();
  expect(within(await cartao("Rework (In Fixes)")).getByText("Clock 9.5 3.")).toBeInTheDocument();
  expect(within(await cartao("Done per project")).getByText("Alarm 2.0 4 (44%) and Clock 9.5 0 (0%).")).toBeInTheDocument();
  expect(within(await cartao("Pass Rate by project")).getByText("Alarm 2.0 80%.")).toBeInTheDocument();
  expect(within(await cartao("Finished per week")).getByText("3 Test Cases in the last 12 weeks, 2 this week.")).toBeInTheDocument();
});

it("trocar de projeto refaz o Pass Rate por modelo com o projeto escolhido (CA-05)", async () => {
  const user = userEvent.setup();
  abrir();

  expect(await within(await cartao("Pass Rate by model")).findByText("Latest Form Factor round: SAMSUNG S26 75%.")).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Alarm 2.0" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "Clock 9.5" }));

  expect(overviewApi.obterProjeto).toHaveBeenLastCalledWith("p2");
});

it("falha: sem In Fixes, o retrabalho mostra o próprio vazio e os outros gráficos continuam (CA-09)", async () => {
  vi.mocked(overviewApi.obterTime).mockResolvedValue({ ...time, emCorrecaoPorProjeto: [] });
  abrir();

  expect(await within(await cartao("Rework (In Fixes)")).findByRole("heading", { name: "No Test Cases in In Fixes" })).toBeInTheDocument();
  expect(within(await cartao("Pass Rate by project")).getByText("Alarm 2.0 80%.")).toBeInTheDocument();
});

it("falha: projeto sem rodada mostra o Pass Rate por modelo vazio (CA-10)", async () => {
  vi.mocked(overviewApi.obterProjeto).mockResolvedValue({ burndown: [], passRate: null });
  abrir();

  expect(await within(await cartao("Pass Rate by model")).findByRole("heading", { name: "No Form Factor round yet" })).toBeInTheDocument();
});

it("falha: com erro na API, os cartões mostram o tentar de novo", async () => {
  vi.mocked(overviewApi.obterTime).mockRejectedValue(new Error("offline"));
  abrir();

  expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("Couldn't load this chart.");
  expect(screen.getAllByRole("button", { name: "Try again" }).length).toBeGreaterThanOrEqual(5);
});
