import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { casosTesteApi, formFactorApi, projetosApi, type CasoTeste } from "../api/projetos.api";
import type { NivelAutomacaoCasoTeste } from "../model/projeto";
import { timesApi } from "@/modules/times/api/times.api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { formatarDiaIso, semanaIso } from "@/shared/lib/utils";
import { ApiError } from "@/shared/api/problem-details";
import { toast } from "@/shared/lib/toast";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";

vi.mock("../api/projetos.api", () => ({
  projetosApi: { obter: vi.fn(), listar: vi.fn() }, casosTesteApi: { listar: vi.fn(), obter: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), transferirParaBackup: vi.fn(), listarPullRequests: vi.fn() },
  formFactorApi: { listar: vi.fn(), listarResultados: vi.fn(), criarRodada: vi.fn(), registrarResultadosRodada: vi.fn(), importar: vi.fn() }, modelosDispositivoApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { membros: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/exportar-planilha");

const projeto = { id: "project-1", unidade_id: "unit-1", time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created" as const, ativo: true, created_at: null, updated_at: null };
const casos = [
  { id: "case-1", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_001", category: "A" as const, difficulty: "Low" as const, automation_level: null as NivelAutomacaoCasoTeste | null, situation: "New" as const, status: "To-Do" as const, responsavel_id: "user-1", backup_id: "backup-1", ativo: true, created_at: null, updated_at: null },
  { id: "case-2", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_002", category: "B" as const, difficulty: "Medium" as const, automation_level: null as NivelAutomacaoCasoTeste | null, situation: "New Step" as const, status: "Done" as const, responsavel_id: "user-2", backup_id: null, ativo: true, created_at: null, updated_at: null },
];
// Literal de propósito: a ordem do progresso é requisito (spec 017).
const ROTULOS_STATUS = ["To-Do", "In Progress", "In Review", "In Validation", "Done", "In Fixes", "Excluded"];
const perfil: PerfilAtual = {
  id: "user-1", nome: "Dev", email: "dev@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: null, perfil: "Desenvolvedor", permissoes: ["projetos.consultar", "test_cases.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: "team-1", tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};

/** Admin na aba Form Factor com o diálogo de criar rodada aberto. */
async function abrirCriacaoRodada() {
  const user = userEvent.setup();
  renderPage({ ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" });
  await screen.findByRole("heading", { name: "Clock 9.5" });
  await user.click(screen.getByRole("tab", { name: "Form Factor" }));
  await user.click(screen.getByRole("button", { name: "Create test round" }));
  return { user, dialog: await screen.findByRole("dialog") };
}

/** Mostra o endereço em que o redirecionamento para o Board terminou. */
function BoardDestino() {
  const local = useLocation();
  return <p>Board {local.pathname}{local.search}</p>;
}

function renderPage(currentProfile = perfil, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }), url = "/projetos/project-1") {
  function ContextOutlet() { return <Outlet context={currentProfile} />; }
  // MemoryRouter declarativo: o createMemoryRouter navega com um Request que o jsdom rejeita.
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><Routes><Route element={<ContextOutlet />}><Route path="projetos/:projetoId" element={<ProjetoDetalhePage />} /><Route path="board/:projetoId" element={<BoardDestino />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

describe("ProjetoDetalhePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 100, total_count: 1 });
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: casos, page: 1, page_size: 10, total_count: 2 });
    vi.mocked(casosTesteApi.criar).mockResolvedValue({ ...casos[0], tc_id: "Clock_003" });
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue(casos[0]);
    vi.mocked(casosTesteApi.transferirParaBackup).mockResolvedValue({ ...casos[0], responsavel_id: "backup-1", backup_id: "user-1" });
    vi.mocked(casosTesteApi.listarPullRequests).mockResolvedValue({ itens: [], pode_remover: false });
    vi.mocked(formFactorApi.listar).mockResolvedValue({ modelos: [], items: [], page: 1, page_size: 10, total_count: 0 });
    vi.mocked(formFactorApi.listarResultados).mockResolvedValue({ modelos: [], items: [], page: 1, page_size: 20, total_count: 0 });
    vi.mocked(formFactorApi.importar).mockResolvedValue({ quantidade_execucoes: 1, quantidade_resultados: 4 } as never);
    vi.mocked(timesApi.membros).mockResolvedValue([
      { id: "m1", time_id: "team-1", usuario_id: "user-1", usuario_nome: "Daniel Oliveira", usuario_user_id: "daniel-id", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m3", time_id: "team-1", usuario_id: "user-2", usuario_nome: "Outro desenvolvedor", usuario_user_id: "outro-id", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m2", time_id: "team-1", usuario_id: "backup-1", usuario_nome: "Kaique Pereira", usuario_user_id: "kaique-id", usuario_perfil: "KP", usuario_perfil_codigo: "KP", ativo: true },
    ]);
  });

  it("mostra só as abas Test Cases e Form Factor", async () => {
    renderPage({ ...perfil, permissoes: [...perfil.permissoes, "form_factor.consultar"] });

    expect(await screen.findByRole("tab", { name: "Test Cases", selected: true })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Test Cases", "Form Factor"]);
  });

  it("link antigo da aba Kanban abre o Kanban do projeto no Board, com os filtros", async () => {
    renderPage(perfil, undefined, "/projetos/project-1?aba=kanban&status=InReview");

    expect(await screen.findByText("Board /board/project-1?status=InReview")).toBeInTheDocument();
    expect(projetosApi.obter).not.toHaveBeenCalled();
  });

  it("dev sem casos no projeto vai para a entrada de Projects, mas o link antigo do Kanban leva ao Board", async () => {
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 1, total_count: 0 });
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 });
    const dev = { ...perfil, perfil_codigo: "USUARIO_PADRAO" };
    const { unmount } = renderPage(dev);

    expect(await screen.findByText("No associated projects or Test Cases")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    unmount();
    vi.clearAllMocks();

    renderPage(dev, undefined, "/projetos/project-1?aba=kanban");
    expect(await screen.findByText("Board /board/project-1")).toBeInTheDocument();
    expect(projetosApi.obter).not.toHaveBeenCalled();
    expect(casosTesteApi.listar).not.toHaveBeenCalled();
  });

  it("aba desconhecida no link cai na aba Test Cases", async () => {
    renderPage(perfil, undefined, "/projetos/project-1?aba=nao-existe");

    expect(await screen.findByRole("tab", { name: "Test Cases", selected: true })).toBeInTheDocument();
  });

  it("exporta todos os Test Cases com os filtros do servidor e os valores legíveis, sem número nem ações", async () => {
    const excluido = { ...casos[1], id: "case-3", tc_id: "Clock_003", status: "Cancelled" as const, justificativa_exclusao: "Fora do escopo" };
    vi.mocked(casosTesteApi.listar).mockImplementation(async (_projetoId, page, pageSize) => ({ items: pageSize === 100 ? [...casos, excluido] : casos, page: page ?? 1, page_size: pageSize ?? 20, total_count: 3 }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("row", { name: /Clock_002/ });
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^test-cases_/)));
    expect(casosTesteApi.listar).toHaveBeenCalledWith("project-1", 1, 100, { responsavelIds: undefined });
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(itens).toEqual([...casos, excluido]);
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["TC ID", "Status", "TC Situation", "Assignee", "Difficulty", "Category", "Automation Level", "End date", "Backup", "Notes"]);
    expect(colunas.map((coluna) => coluna.valor(casos[0]))).toEqual(["Clock_001", "To-Do", "New", "daniel-id", "Low", "A", "—", "—", "kaique-id", "—"]);
    expect(colunas.at(-1)!.valor(excluido)).toBe("Fora do escopo");
  });

  it("permite ao backup cancelar, sem liberar edição dos demais campos", async () => {
    const backup = { ...casos[1], backup_id: "user-1" };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [casos[0], backup], page: 1, page_size: 20, total_count: 2 });
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    const user = userEvent.setup();
    const row = await screen.findByRole("row", { name: /Clock_002/ });
    await user.click(within(row).getByRole("button", { name: /Status Clock_002/ }));
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(["Done", "Excluded"]);
    expect(within(row).queryByRole("button", { name: /Transfer to backup/ })).not.toBeInTheDocument();
    expect(casosTesteApi.listar).toHaveBeenCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: undefined, associadosAMim: true });

    // Excluded tira o caso do fluxo e o DEV não desfaz: só grava depois de confirmar.
    await user.click(screen.getByRole("option", { name: "Excluded" }));
    const confirmacao = await screen.findByRole("alertdialog", { name: "Exclude Clock_002?" });
    expect(confirmacao).toHaveTextContent("Only the assignee, an admin, manager or KP can undo this.");
    expect(casosTesteApi.atualizar).not.toHaveBeenCalled();
    // Spec 026: sem justificativa (ou só com espaços) não dá para confirmar.
    const excluir = within(confirmacao).getByRole("button", { name: "Exclude" });
    expect(excluir).toBeDisabled();
    const justificativa = within(confirmacao).getByLabelText(/Justification/);
    await user.type(justificativa, "   ");
    expect(excluir).toBeDisabled();
    expect(justificativa).toHaveAttribute("maxlength", "500");
    await user.paste("Depende de hardware ");
    expect(confirmacao).toHaveTextContent("23/500 characters");
    // A recusa da API mantém a confirmação aberta com o texto, para tentar de novo.
    vi.mocked(casosTesteApi.atualizar).mockRejectedValueOnce(new Error("Falha de rede."));
    await user.click(excluir);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Falha de rede."));
    expect(within(confirmacao).getByLabelText(/Justification/)).toHaveValue("   Depende de hardware ");
    await user.click(excluir);
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenLastCalledWith("case-2", { status: "Cancelled", justificativa_exclusao: "Depende de hardware" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(toast.success).toHaveBeenCalledWith("Status updated to Excluded.");
  });

  it("abre a justificativa pelo ícone de observações para o perfil Developer", async () => {
    const excluido = { ...casos[1], status: "Cancelled" as const, justificativa_exclusao: "Depende de hardware indisponível" };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [casos[0], excluido], page: 1, page_size: 20, total_count: 2 });
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    const user = userEvent.setup();

    const semJustificativa = await screen.findByRole("row", { name: /Clock_001/ });
    expect(within(semJustificativa).queryByRole("button", { name: /View justification/ })).not.toBeInTheDocument();
    await user.click(within(screen.getByRole("row", { name: /Clock_002/ })).getByRole("button", { name: "View justification Clock_002" }));

    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByText("Justification")).toBeInTheDocument();
    expect(within(painel).getByText("Depende de hardware indisponível")).toBeInTheDocument();
    expect(within(painel).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it.each([
    ["Developer", { ...perfil, perfil_codigo: "USUARIO_PADRAO" }],
    ["gestão", { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" }],
  ] as const)("abre os detalhes do Test Case pelo TC ID para o perfil %s", async (_, perfilAtual) => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue({ ...casos[0], title: "Check Writing style", precondition: null, procedure: "1. Messages\n2-1. Select Shorten", expected_result: null });
    renderPage(perfilAtual);
    const user = userEvent.setup();

    await user.click(within(await screen.findByRole("row", { name: /Clock_001/ })).getByRole("button", { name: "Clock_001" }));

    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByRole("heading", { name: "Clock_001" })).toBeInTheDocument();
    expect(await within(painel).findByText("Check Writing style")).toBeInTheDocument();
    expect(casosTesteApi.obter).toHaveBeenCalledWith("case-1");
  });

  it("abre o painel do Test Case direto pelo link da Auditoria (?caso=&tc=, spec 052)", async () => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue({ ...casos[0], title: "Check Writing style", precondition: null, procedure: null, expected_result: null });
    renderPage(perfil, undefined, "/projetos/project-1?caso=case-1&tc=Clock_001");

    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByRole("heading", { name: "Clock_001" })).toBeInTheDocument();
    expect(casosTesteApi.obter).toHaveBeenCalledWith("case-1");
  });

  it("falha: sem ?caso na URL, nenhum painel abre sozinho", async () => {
    renderPage();
    await screen.findByRole("row", { name: /Clock_001/ });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it.each([
    ["Developer", { ...perfil, perfil_codigo: "USUARIO_PADRAO", permissoes: [...perfil.permissoes, "form_factor.consultar"] }],
    ["gestão", { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" }],
  ] as [string, PerfilAtual][])("abre os detalhes pelo TC ID das tabelas de Form Factor para o perfil %s (spec 030)", async (_, perfilAtual) => {
    vi.mocked(formFactorApi.listar).mockResolvedValue({
      modelos: [], casos_elegiveis: [], page: 1, page_size: 20, total_count: 1,
      items: [{ caso_teste_id: "case-2", tc_id: "Clock_002", responsavel_id: "user-2", sdf_id: null, data_reportada: null, resultados: {} }],
    });
    vi.mocked(formFactorApi.listarResultados).mockResolvedValue({
      modelos: [], page: 1, page_size: 20, total_count: 1,
      items: [{ execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T00:00:00Z", origem: "MANUAL", resultados: {} }],
    });
    vi.mocked(casosTesteApi.obter).mockImplementation(async (id) => ({ ...(id === "case-1" ? casos[0] : casos[1]), title: `Título ${id}`, precondition: null, procedure: null, expected_result: null }));
    renderPage(perfilAtual);
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));

    await user.click(within(await screen.findByRole("row", { name: /Clock_002/ })).getByRole("button", { name: "Clock_002" }));
    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByRole("heading", { name: "Clock_002" })).toBeInTheDocument();
    expect(await within(painel).findByText("Título case-2")).toBeInTheDocument();
    expect(await within(painel).findByRole("heading", { name: "Pull Requests" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();
    expect(casosTesteApi.atualizar).not.toHaveBeenCalled();
  });

  it("abre os detalhes pelo teclado e, ao fechar, devolve o foco ao TC ID sem recarregar a tabela", async () => {
    vi.mocked(casosTesteApi.obter).mockResolvedValue({ ...casos[1], title: null, precondition: null, procedure: null, expected_result: null });
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    const user = userEvent.setup();
    const tcId = within(await screen.findByRole("row", { name: /Clock_002/ })).getByRole("button", { name: "Clock_002" });
    const celula = tcId.closest("td")!;
    const consultas = vi.mocked(casosTesteApi.listar).mock.calls.length;

    // A tabela do React Aria é uma grade: as setas andam entre células e o Tab entra no botão da célula.
    celula.focus();
    await user.tab();
    expect(tcId).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(celula).toContainElement(document.activeElement as HTMLElement));
    if (document.activeElement === celula) await user.tab();
    expect(tcId).toHaveFocus();
    expect(screen.getAllByRole("row", { name: /Clock_00/ })).toHaveLength(2);
    expect(casosTesteApi.listar).toHaveBeenCalledTimes(consultas);
  });

  it("filtra TCs por semana no cabeçalho e mantém as semanas das abas independentes", async () => {
    vi.mocked(casosTesteApi.listar).mockImplementation(async (_id, page = 1, pageSize = 20, filtros) => ({ items: filtros?.semana ? [] : casos, total_count: filtros?.semana ? 0 : casos.length, page, page_size: pageSize }));
    const user = userEvent.setup();
    const { container } = renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO", permissoes: [...perfil.permissoes, "form_factor.consultar"] });
    await screen.findByRole("row", { name: /Clock_001/ });
    await user.click(within(container.querySelector("header")!).getByRole("button", { name: "Week: Select a week" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "This week" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: undefined, associadosAMim: true, semana: semanaIso(new Date()) }));
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));
    expect(screen.getByRole("button", { name: "Week: Select a week" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Test Cases" }));
    await user.click(screen.getByRole("button", { name: /^Week: Week/ }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: undefined, associadosAMim: true }));
    expect(await screen.findByRole("row", { name: /Clock_001/ })).toBeInTheDocument();
    // Fluxo longo (dois calendários, troca de aba): sozinho leva ~3 s e, com a suíte inteira em paralelo, passava dos 5 s.
  }, 15_000);

  it("erro de acesso prevalece sobre associação vazia antiga no cache", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["projetos", "project-1", "test-cases", 1, 1, { associadosAMim: true }, "unit-1", "user-1"], { items: [], total_count: 0 });
    vi.mocked(projetosApi.obter).mockRejectedValue(new Error("403"));
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" }, client);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(casosTesteApi.listar).not.toHaveBeenCalled();
    expect(projetosApi.listar).not.toHaveBeenCalled();
  });

  it("oculta nome do projeto em cache quando revalidação nega o acesso", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["projetos", "detalhe", "project-1", "unit-1", "user-1"], projeto);
    vi.mocked(projetosApi.obter).mockRejectedValue(new Error("404"));
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" }, client);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Clock 9.5" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("oculta casos antigos quando a atualização da consulta é negada", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(["projetos", "project-1", "test-cases", 1, DEFAULT_TABLE_PAGE_SIZE, { associadosAMim: true }, "unit-1", "user-1"], { items: casos, total_count: 2 });
    vi.mocked(casosTesteApi.listar).mockRejectedValue(new Error("403"));
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" }, client);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("Clock_001")).not.toBeInTheDocument();
    expect(screen.queryByText("Clock_002")).not.toBeInTheDocument();
  });

  it("cancelar a confirmação mantém o Test Case com o mesmo responsável", async () => {
    const user = userEvent.setup();
    renderPage();
    const proprioCaso = await screen.findByRole("row", { name: /Clock_001/ });

    await user.click(within(proprioCaso).getByRole("button", { name: "Transfer to backup Clock_001" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(casosTesteApi.transferirParaBackup).not.toHaveBeenCalled();
  });

  it("restringe edição inline e transferência aos casos atribuídos ao usuário", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await screen.findByText("Clock_001");

    expect(screen.queryByRole("button", { name: /New Test Case/i })).not.toBeInTheDocument();
    const proprioCaso = screen.getByRole("row", { name: /Clock_001/ });
    const casoAlheio = screen.getByRole("row", { name: /Clock_002/ });
    expect(within(proprioCaso).getByRole("button", { name: /Category Clock_001/ })).toBeInTheDocument();
    expect(within(proprioCaso).getByText("daniel-id")).toBeInTheDocument();
    expect(within(proprioCaso).getByText("kaique-id")).toBeInTheDocument();
    expect(within(proprioCaso).getByRole("button", { name: "Transfer to backup Clock_001" })).toBeInTheDocument();
    expect(within(casoAlheio).getByText("outro-id")).toBeInTheDocument();
    expect(within(casoAlheio).queryByRole("button", { name: /Category Clock_002/ })).not.toBeInTheDocument();
    expect(within(casoAlheio).queryByRole("button", { name: /Transfer to backup/ })).not.toBeInTheDocument();

    await user.click(within(proprioCaso).getByRole("button", { name: "Transfer to backup Clock_001" }));
    // A transferência troca os papéis: só acontece depois de confirmar.
    const confirmacao = await screen.findByRole("alertdialog", { name: "Transfer to backup?" });
    expect(confirmacao).toHaveTextContent("kaique-id becomes the assignee of Clock_001, and you become the backup.");
    expect(casosTesteApi.transferirParaBackup).not.toHaveBeenCalled();
    await user.click(within(confirmacao).getByRole("button", { name: "Transfer to backup" }));
    await waitFor(() => expect(vi.mocked(casosTesteApi.transferirParaBackup).mock.calls[0][0]).toBe("case-1"));

    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    expect(await screen.findByRole("option", { name: "daniel-id" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "outro-id" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "outro-id" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelIds: ["user-2"] }));
    // Esc só fecha o filtro: a pessoa escolhida continua filtrando a tabela.
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();

    // Seleção múltipla: a segunda pessoa entra no mesmo filtro.
    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    await user.click(await screen.findByRole("option", { name: "daniel-id" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelIds: ["user-2", "user-1"] }));
  });

  it("filtra os casos pela data final escolhida no calendário", async () => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const outroDia = new Date(hoje);
    outroDia.setDate(hoje.getDate() === 1 ? 2 : 1);
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [casos[0], { ...casos[1], updated_at: hoje.toISOString() }], page: 1, page_size: 10, total_count: 2 });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("row", { name: /Clock_002/ });
    const escolherDia = async (dia: Date) => {
      await user.click(screen.getByRole("button", { name: /Filter by End date/i }));
      const calendario = await screen.findByRole("dialog", { name: /End date/i });
      // O calendário (spec 050) usa o ordinal no rótulo do dia: "Friday, October 30th, 2026".
      const dataPorExtenso = `${dia.toLocaleString("en-US", { month: "long" })} ${dia.getDate()}(st|nd|rd|th)?, ${dia.getFullYear()}`;
      await user.click(within(calendario).getByRole("button", { name: new RegExp(dataPorExtenso) }));
    };

    await escolherDia(hoje);
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();

    await escolherDia(outroDia);
    expect(screen.queryByRole("row", { name: /Clock_002/ })).not.toBeInTheDocument();
  });

  it("troca de projeto pelo menu do título quando há outros projetos", async () => {
    const outro = { ...projeto, id: "project-2", nome: "Gallery 1.0" };
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto, outro], page: 1, page_size: 100, total_count: 2 });
    vi.mocked(projetosApi.obter).mockImplementation(async (id) => (id === outro.id ? outro : projeto));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Clock 9.5" }));
    const menu = await screen.findByRole("menu", { name: "Clock 9.5" });
    expect(within(menu).getByRole("menuitemradio", { name: "Clock 9.5" })).toHaveAttribute("aria-checked", "true");
    await user.click(within(menu).getByRole("menuitemradio", { name: "Gallery 1.0" }));

    expect(await screen.findByRole("heading", { name: "Gallery 1.0" })).toBeInTheDocument();
    expect(projetosApi.obter).toHaveBeenLastCalledWith("project-2");
  });

  it("mostra só o título, sem menu, quando não há outro projeto", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Clock 9.5" })).toBeInTheDocument();
    await waitFor(() => expect(projetosApi.listar).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Clock 9.5" })).not.toBeInTheDocument();
  });

  it("permite ao responsável atualizar categoria, dificuldade, status e TC Situation só do próprio caso", async () => {
    const user = userEvent.setup();
    renderPage();
    const proprioCaso = await screen.findByRole("row", { name: /Clock_001/ });

    await user.click(within(proprioCaso).getByRole("button", { name: /Category Clock_001/ }));
    await user.click(await screen.findByRole("option", { name: "C" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { category: "C" }));

    await user.click(within(proprioCaso).getByRole("button", { name: /Difficulty Clock_001/ }));
    await user.click(await screen.findByRole("option", { name: "High" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { difficulty: "High" }));

    await user.click(within(proprioCaso).getByRole("button", { name: /Status Clock_001/ }));
    await user.click(await screen.findByRole("option", { name: "In Progress" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "InProgress" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Status updated to In Progress."));

    await user.click(within(proprioCaso).getByRole("button", { name: /TC Situation Clock_001/ }));
    await user.click(await screen.findByRole("option", { name: "New Step" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { situation: "New Step" }));

    // No caso de outra pessoa o DEV só vê o valor, sem controle de edição.
    const casoAlheio = screen.getByRole("row", { name: /Clock_002/ });
    expect(within(casoAlheio).queryByRole("button", { name: /TC Situation Clock_002/ })).not.toBeInTheDocument();

    expect(within(proprioCaso).queryByRole("button", { name: "Edit Clock_001" })).not.toBeInTheDocument();
  });

  it("oferece ao responsável todos os Status e mostra Done sem Data final em outros estados", async () => {
    const validando = { ...casos[1], id: "case-3", tc_id: "Clock_003", status: "InValidation" as const, updated_at: "2026-10-20T12:00:00Z" };
    const emProgresso = { ...casos[0], status: "InProgress" as const };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [emProgresso, casos[1], validando], page: 1, page_size: 20, total_count: 3 });
    const user = userEvent.setup();
    renderPage();

    const linhaValidando = await screen.findByRole("row", { name: /Clock_003/ });
    expect(within(linhaValidando).getByText("In Validation")).toBeInTheDocument();
    const colunaDataFinal = screen.getAllByRole("columnheader").findIndex((header) => /End date/.test(header.textContent ?? ""));
    expect(linhaValidando.querySelectorAll("th, td")[colunaDataFinal]).toHaveTextContent("—");

    const proprioCaso = screen.getByRole("row", { name: /Clock_001/ });
    await user.click(within(proprioCaso).getByRole("button", { name: /Status Clock_001/ }));
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(ROTULOS_STATUS);
    await user.click(screen.getByRole("option", { name: "In Review" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "InReview" }));

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    // Seleção múltipla: sem "All"; nada marcado é o filtro desligado.
    expect((await screen.findAllByRole("option")).map((item) => item.textContent)).toEqual(ROTULOS_STATUS);
    await user.click(screen.getByRole("option", { name: "In Validation" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("row", { name: /Clock_003/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_002/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(await screen.findByRole("option", { name: "Done" }));
    await user.keyboard("{Escape}");
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Clock_003/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
  });

  describe("Automation Level (spec 027)", () => {
    const comNivel = (caso: (typeof casos)[number], nivel: NivelAutomacaoCasoTeste | null) => ({ ...caso, automation_level: nivel });
    const rotulos = ["1 – Not automatable", "2 – Partially automatable", "3 – 100% automatable"];

    it("mostra a coluna logo depois de Category, com o rótulo do nível ou um traço", async () => {
      vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [comNivel(casos[0], 3), casos[1]], page: 1, page_size: 20, total_count: 2 });
      renderPage();

      const primeiro = await screen.findByRole("row", { name: /Clock_001/ });
      const cabecalhos = screen.getAllByRole("columnheader").map((coluna) => coluna.textContent);
      const posicao = cabecalhos.findIndex((texto) => texto?.includes("Automation Level"));
      expect(posicao).toBe(cabecalhos.findIndex((texto) => texto?.includes("Category")) + 1);
      expect(primeiro.querySelectorAll("th, td")[posicao]).toHaveTextContent("3 – 100% automatable");
      expect(screen.getByRole("row", { name: /Clock_002/ }).querySelectorAll("th, td")[posicao]).toHaveTextContent("—");
    });

    it("mostra a coluna também para quem gerencia os casos", async () => {
      renderPage({ ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" });

      await screen.findByRole("row", { name: /Clock_001/ });
      expect(screen.getByRole("button", { name: "Filter by Automation Level" })).toBeInTheDocument();
    });

    it("oferece só os níveis 1, 2 e 3 na célula e grava o número escolhido, mostrando o novo rótulo", async () => {
      let atuais: CasoTeste[] = [casos[0], casos[1]];
      vi.mocked(casosTesteApi.listar).mockImplementation(async () => ({ items: atuais, page: 1, page_size: 20, total_count: 2 }));
      vi.mocked(casosTesteApi.atualizar).mockImplementation(async (id, input) => {
        atuais = atuais.map((caso) => caso.id === id ? { ...caso, ...input } : caso);
        return atuais.find((caso) => caso.id === id)!;
      });
      const user = userEvent.setup();
      renderPage();
      const proprioCaso = await screen.findByRole("row", { name: /Clock_001/ });

      await user.click(within(proprioCaso).getByRole("button", { name: /Automation Level Clock_001/ }));
      expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(rotulos);
      await user.click(screen.getByRole("option", { name: "2 – Partially automatable" }));

      await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { automation_level: 2 }));
      await waitFor(() => expect(within(screen.getByRole("row", { name: /Clock_001/ })).getByRole("button", { name: /Automation Level Clock_001/ })).toHaveTextContent("2 – Partially automatable"));
    });

    it("deixa o responsável editar só o próprio caso, e a gestão qualquer um", async () => {
      const { unmount } = renderPage();
      const casoAlheio = await screen.findByRole("row", { name: /Clock_002/ });
      expect(within(screen.getByRole("row", { name: /Clock_001/ })).getByRole("button", { name: /Automation Level Clock_001/ })).toBeInTheDocument();
      expect(within(casoAlheio).queryByRole("button", { name: /Automation Level Clock_002/ })).not.toBeInTheDocument();
      unmount();

      renderPage({ ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" });
      const comoGestao = await screen.findByRole("row", { name: /Clock_002/ });
      expect(within(comoGestao).getByRole("button", { name: /Automation Level Clock_002/ })).toBeInTheDocument();
    });

    it("volta ao valor anterior e avisa quando a API recusa a mudança", async () => {
      vi.mocked(casosTesteApi.atualizar).mockRejectedValue(new Error("Automation Level deve ser 1, 2 ou 3."));
      const user = userEvent.setup();
      renderPage();
      const proprioCaso = await screen.findByRole("row", { name: /Clock_001/ });

      await user.click(within(proprioCaso).getByRole("button", { name: /Automation Level Clock_001/ }));
      await user.click(await screen.findByRole("option", { name: "1 – Not automatable" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Automation Level deve ser 1, 2 ou 3."));
      await waitFor(() => expect(within(screen.getByRole("row", { name: /Clock_001/ })).getByRole("button", { name: /Automation Level Clock_001/ })).toHaveTextContent("—"));
    });

    it("filtra por vários níveis ao mesmo tempo", async () => {
      const terceiro = { ...comNivel(casos[0], 3), id: "case-3", tc_id: "Clock_003" };
      vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [comNivel(casos[0], 1), comNivel(casos[1], 2), terceiro], page: 1, page_size: 20, total_count: 3 });
      const user = userEvent.setup();
      renderPage();
      await screen.findByRole("row", { name: /Clock_001/ });

      await user.click(screen.getByRole("button", { name: "Filter by Automation Level" }));
      expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(rotulos);
      await user.click(screen.getByRole("option", { name: "1 – Not automatable" }));
      await user.click(screen.getByRole("option", { name: "3 – 100% automatable" }));
      await user.keyboard("{Escape}");

      expect(screen.getByRole("row", { name: /Clock_001/ })).toBeInTheDocument();
      expect(screen.getByRole("row", { name: /Clock_003/ })).toBeInTheDocument();
      expect(screen.queryByRole("row", { name: /Clock_002/ })).not.toBeInTheDocument();
    });

    it("não mostra a coluna na aba Form Factor", async () => {
      const user = userEvent.setup();
      renderPage({ ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" });
      await screen.findByRole("row", { name: /Clock_001/ });

      await user.click(screen.getByRole("tab", { name: "Form Factor" }));

      await waitFor(() => expect(formFactorApi.listar).toHaveBeenCalled());
      expect(screen.queryByRole("columnheader", { name: /Automation Level/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Filter by Automation Level" })).not.toBeInTheDocument();
    });
  });

  it("deixa o DEV voltar um TC em correção para To-Do", async () => {
    const emCorrecao = { ...casos[0], status: "InFixes" as const };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [emCorrecao], page: 1, page_size: 20, total_count: 1 });
    const user = userEvent.setup();
    renderPage();

    const linha = await screen.findByRole("row", { name: /Clock_001/ });
    const status = within(linha).getByRole("button", { name: /Status Clock_001/ });
    expect(status).toHaveTextContent("In Fixes");
    await user.click(status);
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(ROTULOS_STATUS);
    await user.click(screen.getByRole("option", { name: "To-Do" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "To-Do" }));
  });

  it("oferece In Validation no drawer de edição, na ordem do progresso", async () => {
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    renderPage(admin);
    const linha = await screen.findByRole("row", { name: /Clock_001/ });
    await user.click(within(linha).getByRole("button", { name: "Edit Clock_001" }));
    await user.click(within(screen.getByRole("dialog")).getByLabelText("Status"));
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(ROTULOS_STATUS);
    await user.click(screen.getByRole("option", { name: "In Validation" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "InValidation" }));
  });

  it("exige justificativa no drawer de edição ao mudar o Status para Excluded e a esconde ao voltar", async () => {
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    renderPage(admin);
    const linha = await screen.findByRole("row", { name: /Clock_001/ });
    await user.click(within(linha).getByRole("button", { name: "Edit Clock_001" }));
    const drawer = screen.getByRole("dialog");
    const escolherStatus = async (status: string) => {
      await user.click(within(drawer).getByLabelText("Status"));
      await user.click(await screen.findByRole("option", { name: status }));
    };
    expect(within(drawer).queryByLabelText(/Justification/)).not.toBeInTheDocument();
    await escolherStatus("Excluded");

    const salvar = within(drawer).getByRole("button", { name: "Save" });
    expect(salvar).toBeDisabled();
    await escolherStatus("In Progress");
    expect(within(drawer).queryByLabelText(/Justification/)).not.toBeInTheDocument();
    expect(salvar).toBeEnabled();
    await escolherStatus("Excluded");
    await user.type(within(drawer).getByLabelText(/Justification/), "  Fora do escopo ");
    await user.click(salvar);
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "Cancelled", justificativa_exclusao: "Fora do escopo" }));
  });

  it("permite ao administrador criar um caso e atribuir responsável e backup do time", async () => {
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(await screen.findByRole("button", { name: /New Test Case/i }));
    const drawer = screen.getByRole("dialog");
    await user.type(within(drawer).getByLabelText("TC ID"), "Clock_003");

    await user.click(within(drawer).getByLabelText("Assignee"));
    await user.click(await screen.findByRole("option", { name: /Daniel Oliveira/ }));
    await user.click(within(drawer).getByLabelText("Backup"));
    await user.click(await screen.findByRole("option", { name: /Kaique Pereira/ }));
    // Sem TC Situation o caso não pode ser salvo.
    expect(within(drawer).getByRole("button", { name: "Save" })).toBeDisabled();
    await user.click(within(drawer).getByLabelText("TC Situation"));
    await user.click(await screen.findByRole("option", { name: "Without Changes" }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(casosTesteApi.criar).toHaveBeenCalledWith("project-1", {
      tc_id: "Clock_003", category: "A", difficulty: "Low", situation: "Without Changes", responsavel_id: "user-1", backup_id: "backup-1",
    }));
  });

  it("permite ao KP e ao gerente com permissão editar as atribuições do time", async () => {
    const user = userEvent.setup();
    const managerProfiles = [
      { ...perfil, id: "kp", perfil_codigo: "KP", perfil: "Pessoa-chave", permissoes: [...perfil.permissoes, "test_cases.gerenciar"] },
      { ...perfil, id: "manager", perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: [...perfil.permissoes, "test_cases.gerenciar"] },
    ];

    for (const manager of managerProfiles) {
      const { unmount } = renderPage(manager);
      await screen.findByRole("heading", { name: "Clock 9.5" });
      expect(await screen.findByRole("button", { name: /New Test Case/i })).toBeInTheDocument();
      const otherCase = await screen.findByRole("row", { name: /Clock_002/ });
      await user.click(within(otherCase).getByRole("button", { name: /TC Situation Clock_002/ }));
      await user.click(await screen.findByRole("option", { name: "New" }));
      await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-2", { situation: "New" }));
      await user.click(within(otherCase).getByRole("button", { name: "Edit Clock_002" }));
      const drawer = screen.getByRole("dialog");
      await user.click(within(drawer).getByLabelText("Assignee"));
      await user.click(await screen.findByRole("option", { name: /Daniel Oliveira/ }));
      await user.click(within(drawer).getByLabelText("Backup"));
      await user.click(await screen.findByRole("option", { name: /Kaique Pereira/ }));
      await user.click(within(drawer).getByRole("button", { name: "Save" }));
      // Só os campos alterados vão na requisição, para não desfazer mudanças de outra pessoa.
      await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-2", { responsavel_id: "user-1", backup_id: "backup-1" }));
      unmount();
      vi.mocked(casosTesteApi.atualizar).mockClear();
    }
  });

  it("edita Assignee e Backup direto na tabela com membros ativos distintos", async () => {
    const manager = { ...perfil, id: "manager", perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: [...perfil.permissoes, "test_cases.gerenciar"] };
    const user = userEvent.setup();
    renderPage(manager);

    const row = await screen.findByRole("row", { name: /Clock_001/ });
    await user.click(within(row).getByRole("button", { name: /Assignee Clock_001/ }));
    expect(screen.queryByRole("option", { name: "kaique-id" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "outro-id" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { responsavel_id: "user-2" }));

    await user.click(within(row).getByRole("button", { name: /Backup Clock_001/ }));
    expect(screen.queryByRole("option", { name: "daniel-id" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "outro-id" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { backup_id: "user-2" }));
  });

  it("restaura a atribuição na tabela quando a API recusa a alteração", async () => {
    vi.mocked(casosTesteApi.atualizar).mockRejectedValueOnce(new Error("403"));
    const manager = { ...perfil, id: "manager", perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: [...perfil.permissoes, "test_cases.gerenciar"] };
    const user = userEvent.setup();
    renderPage(manager);

    const row = await screen.findByRole("row", { name: /Clock_001/ });
    const assignee = within(row).getByRole("button", { name: /Assignee Clock_001/ });
    await user.click(assignee);
    await user.click(await screen.findByRole("option", { name: "outro-id" }));

    await waitFor(() => expect(assignee).toHaveTextContent("daniel-id"));
  });

  it("Form Factor sem casos para o Assignee oferece limpar semana e Assignee", async () => {
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    const { container } = renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));
    await user.click(within(container.querySelector("header")!).getByRole("button", { name: "Week: Select a week" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "This week" }));
    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    await user.click(await screen.findByRole("option", { name: "outro-id" }));
    await user.keyboard("{Escape}");

    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: undefined, responsavelIds: undefined }));
    expect(await screen.findByRole("heading", { name: "No test cases yet" })).toBeInTheDocument();
  });

  it("avisa no toast que o SDF ID já tem rodada e mantém o diálogo aberto", async () => {
    const mensagem = "Este SDF ID já tem uma rodada neste projeto.";
    vi.mocked(formFactorApi.criarRodada).mockRejectedValueOnce(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: mensagem, errors: [{ campo: "sdf_id", mensagem }] }));
    const { user, dialog } = await abrirCriacaoRodada();
    await user.type(within(dialog).getByLabelText("SDF ID"), "SDF-001");
    await user.click(within(dialog).getByRole("button", { name: "Create test round" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("This SDF ID already has a round in this project. Use a different one."));
    expect(within(dialog).getByLabelText("SDF ID")).toHaveValue("SDF-001");
  });

  it("mantém no toast os outros erros ao criar a rodada", async () => {
    vi.mocked(formFactorApi.criarRodada).mockRejectedValueOnce(new ApiError({ type: "about:blank", title: "Conflito.", status: 409, detail: "Não há Test Cases em In Validation para iniciar uma rodada." }));
    const { user, dialog } = await abrirCriacaoRodada();
    await user.click(within(dialog).getByRole("button", { name: "Create test round" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não há Test Cases em In Validation para iniciar uma rodada."));
  });

  it("apresenta resultados do Form Factor com filtros e importa relatório SDF", async () => {
    vi.mocked(formFactorApi.listar).mockResolvedValue({
      modelos: [{ id: "model-1", nome: "S27 Ultra" }],
      casos_elegiveis: [{ caso_teste_id: "case-2", tc_id: "Clock_002", responsavel_id: "user-2", backup_id: "backup-1" }],
      items: [{ caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: "12837-93482", data_reportada: "2026-03-23T00:00:00Z", resultados: { "model-1": "PASS" } }],
      page: 1, page_size: 10, total_count: 1,
    });
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    const { container } = renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));

    expect(await screen.findByRole("columnheader", { name: "S27 Ultra" })).toBeInTheDocument();
    expect(screen.queryByText("Eligible Test Cases")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Cases in round")).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: "Clock_001" })).toHaveTextContent(/Clock_001.*12837-93482.*daniel-id.*PASS/);
    expect(formFactorApi.listar).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE }));

    await user.click(within(container.querySelector("header")!).getByRole("button", { name: "Week: Select a week" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "This week" }));
    expect(screen.queryByRole("columnheader", { name: "One UI Version" })).not.toBeInTheDocument();
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: semanaIso(new Date()), responsavelIds: undefined }));

    const primeiroDoMes = new Date();
    primeiroDoMes.setDate(1);
    await user.click(screen.getByRole("button", { name: /^Week: Week \d+/ }));
    const calendario = await screen.findByRole("dialog", { name: "Week" });
    await user.click(within(calendario.querySelector(`[data-day="${formatarDiaIso(primeiroDoMes)}"]`) as HTMLElement).getByRole("button"));
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", expect.objectContaining({ semana: semanaIso(primeiroDoMes) })));

    await user.click(screen.getByRole("button", { name: /^Week: Week \d+/ }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", expect.objectContaining({ semana: undefined })));

    // Assignee filtra no servidor e volta para a página 1.
    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    await user.click(await screen.findByRole("option", { name: "outro-id" }));
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: undefined, responsavelIds: ["user-2"] }));
    await user.keyboard("{Escape}");

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput!, new File(["report"], "sdf.xlsx"));
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(formFactorApi.importar).toHaveBeenCalledWith("project-1", expect.any(File)));
  });

  it("registra resultado pela linha do Resumo só com rodada pendente e vínculo com o TC", async () => {
    const linha = (caso_teste_id: string, tc_id: string, extra: object) => ({ caso_teste_id, tc_id, responsavel_id: "user-2", backup_id: null, sdf_id: null, data_reportada: null, resultados: {}, rodada_pendente_id: null, ...extra });
    vi.mocked(formFactorApi.listar).mockResolvedValue({
      modelos: [{ id: "model-1", nome: "S27 Ultra" }],
      items: [
        linha("case-1", "Clock_001", { responsavel_id: "user-1", rodada_pendente_id: "round-1" }),
        linha("case-3", "Clock_003", { backup_id: "user-1", rodada_pendente_id: "round-1" }),
        linha("case-4", "Clock_004", { responsavel_id: "user-1" }),
        linha("case-5", "Clock_005", { rodada_pendente_id: "round-1" }),
      ],
      page: 1, page_size: 20, total_count: 4,
    });
    vi.mocked(formFactorApi.registrarResultadosRodada).mockResolvedValue({ execucao_id: "e-1", caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-10-25T00:00:00Z", origem: "MANUAL", resultados: { "model-1": "FAIL" } });
    const user = userEvent.setup();
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO", permissoes: [...perfil.permissoes, "form_factor.consultar", "form_factor.registrar"] });
    await user.click(await screen.findByRole("tab", { name: "Form Factor" }));

    await screen.findByRole("row", { name: /Clock_001/ });
    expect(screen.getByRole("button", { name: "Record result Clock_003" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record result Clock_004" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record result Clock_005" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Record result Clock_001" }));
    await user.click(screen.getByRole("button", { name: /Result for S27 Ultra/ }));
    await user.click(await screen.findByRole("option", { name: "FAIL" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(formFactorApi.registrarResultadosRodada).toHaveBeenCalledWith("project-1", "round-1", "case-1", { resultados: { "model-1": "FAIL" } }));
  });

  it("alterna para Results e lista execuções em linhas separadas", async () => {
    vi.mocked(formFactorApi.listarResultados).mockResolvedValue({
      modelos: [{ id: "model-1", nome: "S27 Ultra" }],
      items: [
        { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL", resultados: { "model-1": "FAIL" } },
        { execucao_id: "run-2", caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: "SDF-2", data_reportada: "2026-03-24T10:00:00Z", origem: "SDF", resultados: { "model-1": "PASS" } },
      ],
      page: 1, page_size: 20, total_count: 2,
    });
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));
    // Figma: o seletor fica acima das abas, com Results antes de Summary; Summary continua sendo a visão inicial.
    const visoes = screen.getByRole("radiogroup", { name: "Form Factor views" });
    expect(within(visoes).getAllByRole("radio").map((visao) => visao.textContent)).toEqual(["Results", "Summary"]);
    expect(within(visoes).getByRole("radio", { name: "Summary" })).toBeChecked();
    await user.click(within(visoes).getByRole("radio", { name: "Results" }));

    await waitFor(() => expect(within(visoes).getByRole("radio", { name: "Results" })).toBeChecked());
    expect(await screen.findByRole("columnheader", { name: "Origin" })).toBeInTheDocument();
    expect(screen.getAllByRole("row", { name: /Clock_001/ })).toHaveLength(2);
    expect(formFactorApi.listarResultados).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1 }));
  });
});

describe("ProjetoDetalhePage: etiquetas e numeração dos Test Cases", () => {
  const dev = { ...perfil, perfil_codigo: "USUARIO_PADRAO" };
  const meus = [
    { ...casos[0], id: "case-a", tc_id: "Clock_101" },
    { ...casos[0], id: "case-b", tc_id: "Clock_102", status: "InReview" as const },
    { ...casos[0], id: "case-c", tc_id: "Clock_103", backup_id: null },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 100, total_count: 1 });
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: meus, page: 1, page_size: 20, total_count: 3 });
    vi.mocked(timesApi.membros).mockResolvedValue([]);
  });

  it("mostra as etiquetas de status e numera as linhas, sem caixas de seleção", async () => {
    renderPage(dev);
    const linha = await screen.findByRole("row", { name: /Clock_101/ });
    // O Select do React Aria repete as opções num <select> nativo escondido; a etiqueta é o chip.
    const etiqueta = (linhaDoCaso: HTMLElement, texto: string) => within(linhaDoCaso).getAllByText(texto).find((elemento) => elemento.closest(".chip"));
    expect(etiqueta(linha, "To-Do")).toBeDefined();
    expect(etiqueta(screen.getByRole("row", { name: /Clock_102/ }), "In Review")).toBeDefined();
    expect(within(linha).getByText("01")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /Clock_103/ })).getByText("03")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Transfer to backup \(/ })).not.toBeInTheDocument();
  });

  it("na página 2, a numeração continua a partir da página anterior", async () => {
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: meus, page: 1, page_size: 20, total_count: 45 });
    const user = userEvent.setup();
    renderPage(dev);
    await screen.findByRole("row", { name: /Clock_101/ });

    await user.click(screen.getByRole("button", { name: "Page 2" }));

    await waitFor(() => expect(within(screen.getByRole("row", { name: /Clock_101/ })).getByText("21")).toBeInTheDocument());
  });
});
