import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { TimeDetalhePage } from "./TimeDetalhePage";

const api = vi.hoisted(() => ({ listar: vi.fn(), membros: vi.fn(), remover: vi.fn() }));
const setoresApi = vi.hoisted(() => ({ listar: vi.fn() }));
vi.mock("../api/times.api", () => ({ timesApi: api }));
vi.mock("@/modules/setores/api/setores.api", () => ({ setoresApi }));

const time = { id: "time-1", setor_id: "setor-1", nome: "Produto", gerente_id: null, ativo: true };
const perfilBase: PerfilAtual = {
  id: "kp-1", nome: "Pat", email: "pat@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "KP", perfil: "Pessoa-chave", permissoes: ["times.consultar"], times: [],
  setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderPage(perfil: PerfilAtual) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    {
      path: "/times",
      element: <Outlet context={perfil} />,
      children: [{ path: ":timeId", element: <TimeDetalhePage /> }],
    },
  ], { initialEntries: ["/times/time-1"] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("TimeDetalhePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listar.mockResolvedValue({ items: [time], page: 1, page_size: 100, total_count: 1 });
    api.membros.mockResolvedValue([
      { id: "membership-1", time_id: time.id, usuario_id: "kp-1", usuario_nome: "Pat", usuario_perfil: "Ponto focal", usuario_perfil_codigo: "KP", ativo: true },
    ]);
    setoresApi.listar.mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 });
  });

  it("mostra o perfil da conta na linha do membro", async () => {
    renderPage({ ...perfilBase, times: [{ id: time.id, nome: time.nome }] });

    expect(within(await screen.findByRole("row", { name: "Pat" })).getByText("Key Person")).toBeInTheDocument();
    expect(api.membros).toHaveBeenCalledWith(time.id);
  });

  it("mostra a visão geral do time com setor, status e membros, sem voltar no cabeçalho", async () => {
    setoresApi.listar.mockResolvedValue({ items: [{ id: "setor-1", nome: "SVP", ativo: true }], page: 1, page_size: 100, total_count: 1 });
    renderPage({ ...perfilBase, perfil_codigo: "USUARIO_PADRAO", perfil: "Dev", times: [{ id: time.id, nome: time.nome }] });

    expect(await screen.findByText("Team overview")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Produto" })).toBeInTheDocument();
    expect(await screen.findByText("SVP")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("1 team members")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to teams" })).not.toBeInTheDocument();
  });

  it("falha ao carregar os membros mostra o erro no lugar da lista", async () => {
    api.membros.mockRejectedValue(new Error("offline"));
    renderPage({ ...perfilBase, times: [{ id: time.id, nome: time.nome }] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the team members. Try again.");
  });

  it("gerente que participa do time vê os membros sem as ações de gestão", async () => {
    const gerente = { ...perfilBase, id: "gerente-1", perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["times.consultar", "times.gerenciar"], setores_gerenciados: ["outro-setor"], times: [{ id: time.id, nome: time.nome }] };
    renderPage(gerente);

    expect(await screen.findByRole("row", { name: "Pat" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a team member" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("gerente do setor vê o botão de adicionar membro", async () => {
    renderPage({ ...perfilBase, perfil_codigo: "GERENTE", permissoes: ["times.consultar", "times.gerenciar"], setores_gerenciados: [time.setor_id] });

    expect(await screen.findByRole("button", { name: "Add a team member" })).toBeInTheDocument();
  });

  it("gerente sem setor nem participação não vê o time", async () => {
    renderPage({ ...perfilBase, perfil_codigo: "GERENTE", permissoes: ["times.consultar"], setores_gerenciados: ["outro-setor"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("Team not found or you do not have access.");
    expect(api.membros).not.toHaveBeenCalled();
  });

  it("não carrega detalhes de time fora das participações da conta", async () => {
    renderPage(perfilBase);

    expect(await screen.findByRole("alert")).toHaveTextContent("Team not found or you do not have access.");
    expect(api.membros).not.toHaveBeenCalled();
  });
});
