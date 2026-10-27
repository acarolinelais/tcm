import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { TimesPage } from "./TimesPage";

const api = vi.hoisted(() => ({ listar: vi.fn(), membros: vi.fn(), usuariosDisponiveis: vi.fn() }));
const setoresApi = vi.hoisted(() => ({ listar: vi.fn() }));
vi.mock("../api/times.api", () => ({ timesApi: api }));
vi.mock("@/modules/setores/api/setores.api", () => ({ setoresApi }));

const time = { id: "time-1", setor_id: "setor-b", nome: "Produto", gerente_id: null, ativo: true };
const gerente: PerfilAtual = {
  id: "gerente-1", nome: "Mariana", email: "mariana@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["times.consultar"], times: [],
  setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderPage(perfil: PerfilAtual) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  // MemoryRouter declarativo: o createMemoryRouter navega com um Request que o jsdom rejeita.
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/times"]}><Routes><Route path="times" element={<ContextOutlet />}><Route index element={<TimesPage />} /><Route path=":timeId" element={<p>detalhe</p>} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

describe("TimesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listar.mockResolvedValue({ items: [time], page: 1, page_size: 20, total_count: 1 });
    setoresApi.listar.mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 });
  });

  it("gerente que participa do time abre o detalhe, sem gerenciar membros", async () => {
    const user = userEvent.setup();
    renderPage({ ...gerente, times: [{ id: time.id, nome: time.nome }] });

    await user.click(await screen.findByRole("button", { name: "View team Produto" }));
    expect(await screen.findByText("detalhe")).toBeInTheDocument();
  });

  it("gerente sem setor nem participação não tem a ação de abrir o detalhe", async () => {
    renderPage(gerente);

    expect(await screen.findByText("Produto")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View team Produto" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).not.toBeInTheDocument();
  });

  it("dev membro do time vê o time ativo e o botão de visualizar, sem menu", async () => {
    renderPage({ ...gerente, id: "dev-1", perfil_codigo: "USUARIO_PADRAO", perfil: "Dev", times: [{ id: time.id, nome: time.nome }] });

    expect(await screen.findByRole("button", { name: "View team Produto" })).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Actions for|Manage members/ })).not.toBeInTheDocument();
  });

  it("admin vê visualizar, gerenciar membros e inativar, com a destrutiva por último", async () => {
    api.membros.mockResolvedValue([]);
    api.usuariosDisponiveis.mockResolvedValue([]);
    renderPage({ ...gerente, perfil_codigo: "ADMIN_UNIDADE", perfil: "Admin", permissoes: ["times.consultar", "times.gerenciar"] });

    await screen.findByRole("button", { name: "View team Produto" });
    const acoes = screen.getAllByRole("button", { name: / Produto$/ }).map((botao) => botao.getAttribute("aria-label"));
    expect(acoes).toEqual(["View team Produto", "Manage members Produto", "Deactivate Produto"]);
  });

  it("falha ao carregar mostra o erro no lugar da lista", async () => {
    api.listar.mockRejectedValue(new Error("offline"));
    renderPage(gerente);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load teams. Try again.");
  });
});
