import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";
import { projetosApi } from "./api/projetos.api";
import { ProjetosEntradaPage } from "./ProjetosEntradaPage";

vi.mock("./api/projetos.api", () => ({ projetosApi: { listar: vi.fn() } }));
vi.mock("./ProjetosPage", () => ({ ProjetosPage: () => <p>Lista administrativa</p> }));
const perfil = { id: "dev", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO", permissoes: ["test_cases.consultar"] } as PerfilAtual;
function abrir(current = perfil) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <><nav>Sidebar</nav><Outlet context={current} /></>; }
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/projetos"]}><Routes><Route element={<Contexto />}><Route path="projetos" element={<ProjetosEntradaPage />} /><Route path="projetos/:id" element={<p>Test Cases pessoais</p>} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks());

it("encaminha ao primeiro projeto sem montar a listagem administrativa", async () => {
  vi.mocked(projetosApi.listar).mockResolvedValue({ items: [{ id: "primeiro" }], total_count: 2, page: 1, page_size: 1 } as never);
  abrir();
  expect(await screen.findByText("Test Cases pessoais")).toBeInTheDocument();
  expect(screen.queryByText("Lista administrativa")).not.toBeInTheDocument();
  expect(projetosApi.listar).toHaveBeenCalledWith(1, 1, true);
});
it("apresenta estado vazio único mantendo a navegação", async () => {
  vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 1 });
  abrir();
  expect(await screen.findByRole("heading", { name: "No associated projects or Test Cases" })).toBeInTheDocument();
  expect(screen.getByRole("navigation")).toBeInTheDocument();
});
it("mantém loading sem exibir ausência enquanto a consulta está pendente", () => {
  vi.mocked(projetosApi.listar).mockImplementation(() => new Promise(() => {}));
  abrir();
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.queryByText("No associated projects or Test Cases")).not.toBeInTheDocument();
});
it("mostra falha e repetição sem simular estado vazio", async () => {
  vi.mocked(projetosApi.listar).mockRejectedValue(new Error("offline"));
  abrir();
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  expect(screen.queryByText("No associated projects or Test Cases")).not.toBeInTheDocument();
});
it("preserva a tela dos demais perfis e não consulta dados pessoais", async () => {
  abrir({ ...perfil, perfil_codigo: "KP" });
  expect(screen.getByText("Lista administrativa")).toBeInTheDocument();
  await waitFor(() => expect(projetosApi.listar).not.toHaveBeenCalled());
});
it("não interpreta falta de permissão como ausência de casos", () => {
  abrir({ ...perfil, permissoes: [] });
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(projetosApi.listar).not.toHaveBeenCalled();
});
