import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewPessoal } from "../model/overview";
import { OverviewDev } from "./OverviewDev";

vi.mock("../api/overview.api", () => ({ overviewApi: { obter: vi.fn(), obterPessoal: vi.fn() } }));
const perfil = { id: "d", nome: "Bia Lima", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO", permissoes: [] } as unknown as PerfilAtual;

const pessoal: OverviewPessoal = {
  concluidos: 2,
  atribuidos: 3,
  porDificuldade: { Low: 2, Medium: 0, High: 1 },
  entregasPorDia: [{ dia: "2026-11-04", concluidos: 1 }, { dia: "2026-11-05", concluidos: 1 }],
  entregasPorSemana: [{ semana: "2026-11-02", concluidos: 2 }],
  projetos: [
    { projetoId: "p1", projeto: "Alarm 2.0", app: "Alarm", concluidos: 2, emAndamento: 1, atribuidos: 4 },
    { projetoId: "p2", projeto: "Clock 9.5", app: "Clock", concluidos: 7, emAndamento: 3, atribuidos: 11 },
  ],
};

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewDev />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0); // a primeira frase de cada grupo: o teste não depende do sorteio
  vi.clearAllMocks();
  vi.mocked(overviewApi.obter).mockResolvedValue({ total: 5, concluidos: 2, emAndamento: 1, aFazer: 2, atribuidos: 3, desempenho: [] });
});

it("o cabeçalho do dev mostra Completed, In Progress e Assigned dele no primeiro projeto (spec 064, RN-12)", async () => {
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue(pessoal);
  abrir();

  expect(await screen.findByRole("heading", { level: 2, name: /Bia/ })).toBeInTheDocument();
  const cards = await screen.findByRole("region", { name: "Your Test Cases" });
  expect(within(cards).getByText("2 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("1 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("4 TCs")).toBeInTheDocument();
  expect(within(cards).queryByText("All")).not.toBeInTheDocument();
});

it("a saudação conta o que falta dos TCs atribuídos ao dev, e não do resumo geral (que inclui os de Backup)", async () => {
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue({ ...pessoal, atribuidos: 10 }); // geral: 5 total, 2 feitos
  abrir();

  expect(await screen.findByText("Don't give up, 8 test cases to go!")).toBeInTheDocument();
});

it("com dois ou mais projetos, o dev escolhe o projeto e os cards trocam", async () => {
  const user = userEvent.setup();
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue(pessoal);
  abrir();

  await user.click(await screen.findByRole("button", { name: "Alarm 2.0" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "Clock 9.5" }));

  const cards = screen.getByRole("region", { name: "Your Test Cases" });
  expect(within(cards).getByText("7 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("3 TCs")).toBeInTheDocument();
  expect(within(cards).getByText("11 TCs")).toBeInTheDocument();
});

it("com um projeto só, o dev vê o nome do projeto sem o seletor", async () => {
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue({ ...pessoal, projetos: [pessoal.projetos[1]] });
  abrir();

  expect(await screen.findByText("Clock 9.5")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Clock 9.5" })).not.toBeInTheDocument();
  expect(within(screen.getByRole("region", { name: "Your Test Cases" })).getByText("11 TCs")).toBeInTheDocument();
});

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
