import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { listarPerfis } from "@/modules/perfis/api/perfis.api";
import { projetosApi } from "@/modules/projetos/api/projetos.api";
import { usuarioApi } from "@/modules/usuarios/api/usuario.api";

import { auditoriaApi } from "../api/auditoria.api";
import type { RegistroAuditoria } from "../model/auditoria";
import { AuditoriaPage } from "./AuditoriaPage";

vi.mock("../api/auditoria.api", () => ({ auditoriaApi: { listar: vi.fn() } }));
vi.mock("@/modules/perfis/api/perfis.api", () => ({ listarPerfis: vi.fn() }));
vi.mock("@/modules/projetos/api/projetos.api", () => ({ projetosApi: { listar: vi.fn() } }));
vi.mock("@/modules/usuarios/api/usuario.api", () => ({ usuarioApi: { listar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/exportar-planilha");

const admin: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};

const registro: RegistroAuditoria = {
  id: 1284, alterado_em: "2026-10-30T15:42:00Z", usuario_nome: "Ana Souza", usuario_perfil: "Key Person", acao: "alteracao",
  caso_teste_id: "caso-1", tc_id: "Clock_001", projeto_id: "projeto-1", projeto_nome: "Clock 9.5",
  alteracoes: [{ campo: "status", valor_anterior: "InProgress", valor_novo: "InReview" }, { campo: "category", valor_anterior: "B", valor_novo: "A" }],
  origem: "api", tela: "/projetos/projeto-1/kanban",
};
const pagina = (items: RegistroAuditoria[]) => ({ items, page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: items.length });

function renderPage(perfil = admin) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "admin/auditoria", element: <AuditoriaPage /> }] }], { initialEntries: ["/admin/auditoria"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("AuditoriaPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(auditoriaApi.listar).mockResolvedValue(pagina([registro]));
    vi.mocked(listarPerfis).mockResolvedValue([{ id: "p1", codigo: "KP", nome: "Key Person" }] as never);
    vi.mocked(usuarioApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 } as never);
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 } as never);
  });

  it("lista os registros com o resumo '+1' e abre o detalhe com todas as alterações", async () => {
    const user = userEvent.setup();
    renderPage();

    const linha = await screen.findByRole("row", { name: /Clock_001/ });
    expect(within(linha).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(linha).getByText("Changed")).toBeInTheDocument();
    // Primeira mudança em etiquetas coloridas e "+1"; o texto inteiro fica no title.
    expect(within(linha).getByTitle("Status: In Progress → In Review +1")).toBeInTheDocument();
    expect(within(linha).getByText("In Progress")).toBeInTheDocument();
    expect(within(linha).getByText("In Review")).toBeInTheDocument();
    expect(within(linha).getByText("+1")).toBeInTheDocument();
    expect(auditoriaApi.listar).toHaveBeenCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, {});

    await user.click(within(linha).getByRole("button", { name: "View details Clock_001" }));

    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByText("In Review")).toBeInTheDocument();
    expect(within(painel).getByText("Category")).toBeInTheDocument();
    // Fora do Status, o valor que saiu vem riscado e o que entrou, não.
    expect(within(painel).getByText("B")).toHaveClass("line-through");
    expect(within(painel).getByText("A")).not.toHaveClass("line-through");
    expect(within(painel).getByRole("link", { name: "Open Test Case" })).toHaveAttribute("href", "/projetos/projeto-1?caso=caso-1&tc=Clock_001");
  });

  it("filtra pela origem e volta à página 1", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("row", { name: /Clock_001/ });

    await user.click(screen.getByRole("button", { name: "Filter by Origin" }));
    await user.click(await screen.findByRole("option", { name: "Form Factor" }));

    await waitFor(() => expect(auditoriaApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, { origem: "form_factor" }));
  });

  it("vazio com filtro mostra 'No records found' e 'Clear filters' volta à lista completa", async () => {
    const user = userEvent.setup();
    vi.mocked(auditoriaApi.listar).mockImplementation(async (_page, _size, filtros) => pagina(filtros?.origem ? [] : [registro]));
    renderPage();
    await screen.findByRole("row", { name: /Clock_001/ });

    await user.click(screen.getByRole("button", { name: "Filter by Origin" }));
    await user.click(await screen.findByRole("option", { name: "Form Factor" }));

    expect(await screen.findByText("No records found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(await screen.findByRole("row", { name: /Clock_001/ })).toBeInTheDocument();
  });

  it("exportar todos os itens busca com os mesmos filtros", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("row", { name: /Clock_001/ });
    await user.click(screen.getByRole("button", { name: "Filter by Origin" }));
    await user.click(await screen.findByRole("option", { name: "Form Factor" }));
    vi.mocked(auditoriaApi.listar).mockClear();

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(auditoriaApi.listar).toHaveBeenCalledWith(1, 100, { origem: "form_factor" }));
  });

  it("falha: erro da API aparece com role alert", async () => {
    vi.mocked(auditoriaApi.listar).mockRejectedValue(new Error("falhou"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the audit records.");
  });

  it("falha: quem não é admin vê 'sem permissão' e a API não é chamada", () => {
    renderPage({ ...admin, perfil_codigo: "GERENTE" });

    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to view this page.");
    expect(auditoriaApi.listar).not.toHaveBeenCalled();
  });

  it("falha: período com fim antes do início não é aplicado", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("row", { name: /Clock_001/ });
    // O calendário abre no mês atual: escolhe o dia 20 como início e o 10 como fim.
    const hoje = new Date();
    const mesAno = `${new Intl.DateTimeFormat("en-US", { month: "long" }).format(hoje)} %s, ${hoje.getFullYear()}`;
    const dia = (n: string) => screen.findByRole("button", { name: new RegExp(mesAno.replace("%s", n)) });

    await user.click(screen.getByRole("button", { name: "Filter by Date and time From" }));
    await user.click(await dia("20th"));
    await waitFor(() => expect(auditoriaApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, expect.objectContaining({ data_inicio: expect.stringMatching(/-20$/) })));
    vi.mocked(auditoriaApi.listar).mockClear();
    await user.click(screen.getByRole("button", { name: "Filter by Date and time To" }));
    await user.click(await dia("10th"));

    expect(toast.error).toHaveBeenCalledWith("The end date can't be before the start date.");
    expect(auditoriaApi.listar).not.toHaveBeenCalled();
  });
});
