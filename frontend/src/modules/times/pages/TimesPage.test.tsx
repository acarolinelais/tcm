import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";
import { TimesPage } from "./TimesPage";

const api = vi.hoisted(() => ({ listar: vi.fn(), membros: vi.fn(), usuariosDisponiveis: vi.fn() }));
const setoresApi = vi.hoisted(() => ({ listar: vi.fn() }));
vi.mock("../api/times.api", () => ({ timesApi: api }));
vi.mock("@/modules/setores/api/setores.api", () => ({ setoresApi }));
vi.mock("@/shared/lib/exportar-planilha");

const time = { id: "time-1", setor_id: "setor-b", nome: "Produto", gerente_id: null, ativo: true };
const gerente: PerfilAtual = {
  id: "gerente-1", nome: "Mariana", email: "mariana@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["times.consultar"], times: [],
  setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
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

  it("título na cor de acento e rodapé com a paginação, sem total (spec 055, CA-10)", async () => {
    renderPage(gerente);

    expect(await screen.findByRole("heading", { level: 1, name: "Teams" })).toHaveClass("text-accent-text");
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.queryByText(/\btotal\b/i)).not.toBeInTheDocument();
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

  it("admin exporta todos com os filtros e os nomes dos membros, sem a coluna de ações", async () => {
    const suporte = { id: "time-2", setor_id: "setor-b", setor_nome: "Engenharia", nome: "Suporte", gerente_id: null, ativo: false };
    api.listar.mockImplementation(async (page: number, pageSize: number) => ({ items: pageSize === 100 ? [time, suporte] : [time], page, page_size: pageSize, total_count: 2 }));
    api.membros.mockImplementation(async (id: string) => id === "time-2" ? [{ id: "m1", time_id: "time-2", usuario_id: "u-ana", ativo: true }, { id: "m2", time_id: "time-2", usuario_id: "u-bia", ativo: false }] : []);
    api.usuariosDisponiveis.mockResolvedValue([{ id: "u-ana", nome: "Ana" }, { id: "u-bia", nome: "Bia" }]);
    const user = userEvent.setup();
    renderPage({ ...gerente, perfil_codigo: "ADMIN_UNIDADE", perfil: "Admin", permissoes: ["times.consultar", "times.gerenciar"] });

    await screen.findByRole("button", { name: "View team Produto" });
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^times_/)));
    expect(api.listar).toHaveBeenCalledWith(1, 100, {});
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["Teams", "Sector", "Members", "Status"]);
    expect(itens).toEqual([time, suporte]);
    expect(colunas.map((coluna) => coluna.valor(suporte))).toEqual(["Suporte", "Engenharia", "Ana", "Inactive"]);
  });
});
