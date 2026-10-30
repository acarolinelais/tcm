import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { usuarioApi } from "@/modules/usuarios/api/usuario.api";

import { setoresApi } from "../api/setores.api";
import { SetoresPage } from "./SetoresPage";

vi.mock("../api/setores.api", () => ({ setoresApi: { listar: vi.fn(), gerentes: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), associar: vi.fn(), desassociar: vi.fn() } }));
vi.mock("@/modules/perfis/api/perfis.api", () => ({ listarPerfis: vi.fn() }));
vi.mock("@/modules/usuarios/api/usuario.api", () => ({ usuarioApi: { listar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/exportar-planilha");
import { toast } from "@/shared/lib/toast";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";

const admin: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};
const engenharia = { id: "setor-1", unidade_id: "unit-1", nome: "Engenharia", ativo: true };
const suporte = { id: "setor-2", unidade_id: "unit-1", nome: "Suporte", ativo: false };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function ContextOutlet() { return <Outlet context={admin} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "admin/setores", element: <SetoresPage /> }] }], { initialEntries: ["/admin/setores"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("SetoresPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(setoresApi.listar).mockResolvedValue({ items: [engenharia, suporte], page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: 2 } as never);
    vi.mocked(setoresApi.gerentes).mockImplementation(async (id) => (id === "setor-1" ? [{ setor_id: "setor-1", usuario_id: "user-ivan", ativo: true }] : []) as never);
    vi.mocked(listarPerfis).mockResolvedValue([{ id: "perfil-gerente", codigo: "GERENTE", nome: "Gerente" }] as never);
    vi.mocked(usuarioApi.listar).mockResolvedValue({ items: [
      { id: "user-ivan", nome: "Ivan Moreira", email: "ivan@example.com", ativo: true },
      { id: "user-bia", nome: "Bia Costa", email: "bia@example.com", ativo: true },
    ], page: 1, page_size: 100, total_count: 2 } as never);
  });

  it("lista os setores com gerentes, status e ações, 20 por página", async () => {
    renderPage();

    const linha = await screen.findByRole("row", { name: /Engenharia/ });
    await waitFor(() => expect(within(linha).getByText("Ivan Moreira")).toBeInTheDocument());
    expect(within(linha).getByText("Active")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Suporte/ })).getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate Engenharia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate Suporte" })).toBeInTheDocument();
    expect(setoresApi.listar).toHaveBeenCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, undefined, undefined);
  });

  it("pede confirmação antes de inativar um setor", async () => {
    vi.mocked(setoresApi.atualizar).mockResolvedValue({ ...engenharia, ativo: false } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Deactivate Engenharia" }));
    expect(setoresApi.atualizar).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /Deactivate/ }));

    await waitFor(() => expect(setoresApi.atualizar).toHaveBeenCalledWith("setor-1", { nome: undefined, ativo: false }));
  });

  it("mostra o estado de erro quando a listagem falha", async () => {
    vi.mocked(setoresApi.listar).mockRejectedValue(new Error("falhou"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load sectors. Try again.");
  });

  it("exportar todos leva os gerentes também dos setores que não estão na página", async () => {
    const financeiro = { id: "setor-3", unidade_id: "unit-1", nome: "Financeiro", ativo: true };
    vi.mocked(setoresApi.listar).mockImplementation(async (page, pageSize) => ({ items: pageSize === 100 ? [engenharia, suporte, financeiro] : [engenharia, suporte], page: page ?? 1, page_size: pageSize ?? 20, total_count: 3 }) as never);
    vi.mocked(setoresApi.gerentes).mockImplementation(async (id) => (id === "setor-3" ? [{ setor_id: "setor-3", usuario_id: "user-bia", ativo: true }] : []) as never);
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("row", { name: /Engenharia/ });
    await waitFor(() => expect(screen.getByRole("button", { name: "Export" })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^setores_/)));
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["Sector", "Managers", "Status"]);
    expect(itens).toEqual([engenharia, suporte, financeiro]);
    expect(colunas[1].valor(financeiro)).toBe("Bia Costa");
    expect(colunas[2].valor(suporte)).toBe("Inactive");
  });

  describe("painel Novo setor (spec 031)", () => {
    async function abrirNovo(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: "New sector" }));
      return screen.findByRole("dialog");
    }

    it("abre à direita com o nome e o gerente em \"Sem responsável\", e cria o setor com o gerente escolhido", async () => {
      vi.mocked(setoresApi.criar).mockResolvedValue({ id: "setor-3", unidade_id: "unit-1", nome: "Financeiro", ativo: true } as never);
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirNovo(user);
      expect(within(painel).getByRole("heading", { name: "New sector" })).toBeInTheDocument();
      const gerente = within(painel).getByRole("button", { name: /Select manager/ });
      expect(gerente).toHaveTextContent("Unassigned");
      await user.type(within(painel).getByRole("textbox", { name: /Sector name/ }), "Financeiro");
      await user.click(gerente);
      await user.click(await screen.findByRole("option", { name: "Bia Costa · bia@example.com" }));
      await user.click(within(painel).getByRole("button", { name: "Create sector" }));

      await waitFor(() => expect(setoresApi.criar).toHaveBeenCalledWith("Financeiro", "user-bia"));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(toast.success).toHaveBeenCalledWith("Sector created.");
    });

    it("não cria sem nome: mostra a mensagem no campo e o painel continua aberto", async () => {
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirNovo(user);
      await user.click(within(painel).getByRole("button", { name: "Create sector" }));

      expect(await within(painel).findByText("This field is required.")).toBeInTheDocument();
      expect(setoresApi.criar).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("fecha com Esc sem salvar e devolve o foco a Novo setor", async () => {
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirNovo(user);
      await user.type(within(painel).getByRole("textbox", { name: /Sector name/ }), "Rascunho");
      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(setoresApi.criar).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByRole("button", { name: "New sector" })).toHaveFocus());
    });
  });

  describe("painel do setor e gerentes (spec 031)", () => {
    async function abrirEngenharia(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: "Edit sector Engenharia" }));
      return screen.findByRole("dialog");
    }

    it("associa o gerente escolhido na lista", async () => {
      vi.mocked(setoresApi.associar).mockResolvedValue({ setor_id: "setor-1", usuario_id: "user-bia", ativo: true } as never);
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEngenharia(user);
      expect(within(painel).getByRole("heading", { name: "Sector: Engenharia" })).toBeInTheDocument();
      expect(await within(painel).findByText("Ivan Moreira")).toBeInTheDocument();
      await user.click(within(painel).getByRole("button", { name: /Select manager/ }));
      expect(screen.queryByRole("option", { name: /Ivan Moreira/ })).not.toBeInTheDocument();
      await user.click(await screen.findByRole("option", { name: "Bia Costa · bia@example.com" }));
      await user.click(within(painel).getByRole("button", { name: "Add" }));

      await waitFor(() => expect(setoresApi.associar).toHaveBeenCalledWith("setor-1", "user-bia"));
      expect(toast.success).toHaveBeenCalledWith("Manager assigned to the sector.");
    });

    it("fecha com Esc sem salvar, devolve o foco e reabre com o nome salvo", async () => {
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEngenharia(user);
      const nome = within(painel).getByRole("textbox", { name: /Sector name/ });
      await user.clear(nome);
      await user.type(nome, "Rascunho");
      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(setoresApi.atualizar).not.toHaveBeenCalled();
      // A tabela do React Aria é uma grade: o foco volta à célula da ação, não ao botão (como na spec 028).
      await waitFor(() => expect(screen.getByRole("row", { name: /Engenharia/ })).toContainElement(document.activeElement as HTMLElement));
      const reaberto = await abrirEngenharia(user);
      expect(within(reaberto).getByRole("textbox", { name: /Sector name/ })).toHaveValue("Engenharia");
    });

    it("mantém o painel aberto com a escolha quando a API recusa a associação", async () => {
      vi.mocked(setoresApi.associar).mockRejectedValue(new Error("falhou"));
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEngenharia(user);
      await user.click(within(painel).getByRole("button", { name: /Select manager/ }));
      await user.click(await screen.findByRole("option", { name: "Bia Costa · bia@example.com" }));
      await user.click(within(painel).getByRole("button", { name: "Add" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not update the manager assignment."));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(within(painel).getByRole("button", { name: /Select manager/ })).toHaveTextContent("Bia Costa");
    });
  });
});
