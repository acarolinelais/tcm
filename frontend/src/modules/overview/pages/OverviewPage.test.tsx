import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";
import { overviewApi } from "../api/overview.api";
import type { OverviewData } from "../model/overview";
import { OverviewPage } from "./OverviewPage";

vi.mock("../api/overview.api", () => ({ overviewApi: { obter: vi.fn() } }));
const perfil = { id: "g", nome: "Ana", unidade_id: "u", perfil_codigo: "GERENTE", permissoes: [] } as unknown as PerfilAtual;
const meses = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
const dados: OverviewData = {
  total: 10, concluidos: 4, emAndamento: 3, aFazer: 3, atribuidos: 2,
  desempenho: meses.map((mes) => ({ mes, concluidos: mes === "2026-09" ? 2 : 0 })),
};

function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  return render(<QueryClientProvider client={client}><MemoryRouter><Routes><Route element={<Contexto />}><Route index element={<OverviewPage />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks());

it("mostra as contagens do escopo e a porcentagem de concluídos", async () => {
  vi.mocked(overviewApi.obter).mockResolvedValue(dados);
  abrir();

  expect(await screen.findByText("4 TCs")).toBeInTheDocument();
  expect(screen.getByText("10 TCs")).toBeInTheDocument();
  expect(screen.getByText("40%")).toBeInTheDocument();
  // Sem hover, o gráfico de desempenho mostra o mês atual.
  expect(screen.getByText("0 TCs")).toBeInTheDocument();
  expect(screen.getByText("Sep")).toBeInTheDocument();
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

it("as fatias arredondadas para cima não deixam a de andamento negativa", async () => {
  vi.mocked(overviewApi.obter).mockResolvedValue({ ...dados, total: 8, concluidos: 3, aFazer: 5, emAndamento: 0 });
  abrir();

  expect(await screen.findByText("38%")).toBeInTheDocument();
  expect(screen.getByText("In Progress: 0%")).toBeInTheDocument();
});
