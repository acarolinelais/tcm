import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewData } from "../model/overview";
import { OverviewPage } from "./OverviewPage";

vi.mock("../api/overview.api", () => ({ overviewApi: { obter: vi.fn(), obterTime: vi.fn(), obterProjeto: vi.fn(), obterPessoal: vi.fn() } }));
let perfil = { id: "g", nome: "Ana", unidade_id: "u", perfil_codigo: "GERENTE", permissoes: [] } as unknown as PerfilAtual;
const meses = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const dados: OverviewData = {
  total: 10, concluidos: 4, emAndamento: 3, aFazer: 3, atribuidos: 2,
  desempenho: meses.map((mes) => ({ mes, concluidos: mes === "2026-09" ? 2 : 0 })),
};

const semGraficos = { projetos: [], criacaoPorDia: [], concluidosPorDev: [], concluidosPorSemana: [], donePorProjeto: [], andamentoPorTime: [], andamentoPorSetor: [], emCorrecaoPorProjeto: [], passRatePorProjeto: [] };

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  perfil = { ...perfil, perfil_codigo: "GERENTE" };
});

it("um perfil sem visão própria fica com o cabeçalho e as contagens do escopo (spec 064, RN-12)", async () => {
  perfil = { ...perfil, perfil_codigo: null as unknown as string };
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  abrir();

  expect(await screen.findByRole("heading", { level: 2, name: "Hi Ana, you are almost done." })).toBeInTheDocument();
  expect(screen.getByText("4 TCs")).toBeInTheDocument();
  expect(screen.getByText("3 TCs")).toBeInTheDocument();
  expect(screen.getByText("10 TCs")).toBeInTheDocument();
  expect(overviewApi.obterTime).not.toHaveBeenCalled();
});

it("sem casos no escopo mostra o estado vazio em vez de zeros", async () => {
  vi.mocked(overviewApi.obter).mockResolvedValue({ ...dados, total: 0, concluidos: 0, emAndamento: 0, aFazer: 0, atribuidos: 0 });
  abrir();

  expect(await screen.findByRole("heading", { name: "No Test Cases to show yet" })).toBeInTheDocument();
  expect(screen.queryByText("0 TCs")).not.toBeInTheDocument();
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

it("com erro na API mostra a mensagem e permite tentar de novo", async () => {
  vi.mocked(overviewApi.obter).mockRejectedValue(new Error("offline"));
  abrir();

  expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the overview.");
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
});

// Specs 063 e 064: cada perfil tem a sua visão de gráficos.
it("o KP vê os gráficos do time", async () => {
  perfil = { ...perfil, perfil_codigo: "KP" };
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  vi.mocked(overviewApi.obterTime).mockResolvedValue({ projetos: [], criacaoPorDia: [], concluidosPorDev: [], concluidosPorSemana: [], donePorProjeto: [], andamentoPorTime: [], andamentoPorSetor: [], emCorrecaoPorProjeto: [], passRatePorProjeto: [] });
  abrir();

  // A visão entra por React.lazy: sob carga, o chunk demora mais que o 1 s padrão do findBy.
  expect(await screen.findByRole("region", { name: "Finished per week" }, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Hi Ana, you are almost done." })).toBeInTheDocument();
});

it("o dev vê os próprios gráficos e não vê o card All (RN-13)", async () => {
  perfil = { ...perfil, perfil_codigo: "USUARIO_PADRAO" };
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  vi.mocked(overviewApi.obterPessoal).mockResolvedValue({ concluidos: 0, atribuidos: 0, porDificuldade: {}, entregasPorDia: [], entregasPorSemana: [], projetos: [] });
  abrir();

  expect(await screen.findByRole("region", { name: "Test Cases by difficulty" }, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Hi Ana, you are almost done." })).toBeInTheDocument();
  expect(screen.queryByText("All")).not.toBeInTheDocument();
  expect(overviewApi.obterTime).not.toHaveBeenCalled();
});

it("o gerente vê a própria visão de gráficos, com o cabeçalho", async () => {
  perfil = { ...perfil, perfil_codigo: "GERENTE" };
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  vi.mocked(overviewApi.obterTime).mockResolvedValue(semGraficos);
  abrir();

  expect(await screen.findByRole("region", { name: "Progress by team" }, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 2, name: "Hi Ana, you are almost done." })).toBeInTheDocument();
});

it("o admin vê o próprio cabeçalho, sem o cartão de topo dos outros perfis (spec 064, RN-12)", async () => {
  perfil = { ...perfil, perfil_codigo: "ADMIN_UNIDADE" };
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  vi.mocked(overviewApi.obterTime).mockResolvedValue(semGraficos);
  abrir();

  expect(await screen.findByRole("heading", { level: 2, name: "Hi Ana, you are almost done." }, { timeout: 5000 })).toBeInTheDocument();
  expect(screen.getByText("Don't give up, only 6 test cases left!")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "Progress by sector" })).toBeInTheDocument();
});
