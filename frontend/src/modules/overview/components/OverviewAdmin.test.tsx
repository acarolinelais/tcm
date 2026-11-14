import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewData, OverviewTime } from "../model/overview";
import { OverviewAdmin } from "./OverviewAdmin";

vi.mock("../api/overview.api", () => ({ overviewApi: { obter: vi.fn(), obterTime: vi.fn() } }));
const perfil = { id: "a", nome: "Caroline Lais", unidade_id: "u", perfil_codigo: "ADMIN_UNIDADE", permissoes: [] } as unknown as PerfilAtual;

const resumo: OverviewData = { total: 400, concluidos: 57, emAndamento: 0, aFazer: 0, atribuidos: 0, desempenho: [] };
const time: OverviewTime = {
  projetos: [{ id: "p1", nome: "Clock 9.5", app: "Clock" }, { id: "p2", nome: "Keyboard 9.5", app: "Keyboard" }],
  criacaoPorDia: [],
  concluidosPorDev: [],
  concluidosPorSemana: [{ semana: "2026-10-26", concluidos: 0 }, { semana: "2026-11-02", concluidos: 2 }],
  donePorProjeto: [
    { projetoId: "p1", projeto: "Clock 9.5", concluidos: 26, total: 230, emAndamento: 16 },
    { projetoId: "p2", projeto: "Keyboard 9.5", concluidos: 31, total: 170, emAndamento: 40 },
  ],
  andamentoPorTime: [],
  andamentoPorSetor: [{ id: "s1", nome: "Engenharia", aFazer: 2, emAndamento: 3, concluidos: 4 }, { id: "s2", nome: "Mobile", aFazer: 1, emAndamento: 1, concluidos: 0 }],
  emCorrecaoPorProjeto: [],
  passRatePorProjeto: [{ projetoId: "p1", projeto: "Alarm 2.0", aprovados: 8, total: 10 }, { projetoId: "p2", projeto: "Clock 9.5", aprovados: 1, total: 4 }],
};

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewAdmin />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
const cartao = (nome: string) => screen.findByRole("region", { name: nome });

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0); // a primeira frase de cada grupo: o teste não depende do sorteio
  vi.clearAllMocks();
  vi.mocked(overviewApi.obter).mockResolvedValue(resumo);
  vi.mocked(overviewApi.obterTime).mockResolvedValue(time);
});

it("saúda pelo primeiro nome, diz quanto falta no projeto escolhido e mostra os cards dele (CA-12)", async () => {
  abrir();

  expect(await screen.findByRole("heading", { level: 2, name: /Caroline/ })).toBeInTheDocument();
  // Clock 9.5: 230 casos, 26 em Done. A unidade inteira daria 343.
  expect(await screen.findByText("Don't give up, 204 test cases to go!")).toBeInTheDocument();
  const cards = await screen.findByRole("region", { name: "Test Cases of the chosen project" });
  expect(within(cards).getByText("26 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("16 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("230 TCs")).toBeInTheDocument();
});

it("trocar de projeto troca os três cards (CA-13)", async () => {
  const user = userEvent.setup();
  abrir();

  await user.click(await screen.findByRole("button", { name: "Clock 9.5" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "Keyboard 9.5" }));

  const cards = screen.getByRole("region", { name: "Test Cases of the chosen project" });
  expect(within(cards).getByText("31 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("40 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("170 TCs")).toBeInTheDocument();
});

it("falha: com o projeto escolhido concluído, a frase diz que está tudo pronto mesmo com a unidade em aberto", async () => {
  vi.mocked(overviewApi.obterTime).mockResolvedValue({ ...time, donePorProjeto: [{ ...time.donePorProjeto[0], concluidos: 230, emAndamento: 0 }, time.donePorProjeto[1]] });
  abrir();

  expect(await screen.findByText("Everything is done. Great job!")).toBeInTheDocument();
});

it("mostra o andamento de cada setor, os finalizados por semana e o Pass Rate dos projetos da unidade (CA-06 a CA-08)", async () => {
  abrir();

  expect(await within(await cartao("Progress by sector")).findByText("Engenharia: 2 to do, 3 in progress, 4 done and Mobile: 1 to do, 1 in progress, 0 done")).toBeInTheDocument();
  expect(within(await cartao("Finished per week")).getByText("2 Test Cases in the last 12 weeks, 2 this week.")).toBeInTheDocument();
  expect(within(await cartao("Pass Rate by project")).getByText("Alarm 2.0 80% and Clock 9.5 25%.")).toBeInTheDocument();
});

it("falha: sem rodada em nenhum projeto, o Pass Rate mostra o próprio vazio e o andamento continua", async () => {
  vi.mocked(overviewApi.obterTime).mockResolvedValue({ ...time, passRatePorProjeto: [] });
  abrir();

  expect(await within(await cartao("Pass Rate by project")).findByRole("heading", { name: "No Form Factor round yet" })).toBeInTheDocument();
  expect(within(await cartao("Progress by sector")).getByText(/Engenharia: 2 to do/)).toBeInTheDocument();
});
