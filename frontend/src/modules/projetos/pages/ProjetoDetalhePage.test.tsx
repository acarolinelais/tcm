import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { casosTesteApi, formFactorApi, projetosApi } from "../api/projetos.api";
import { timesApi } from "@/modules/times/api/times.api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";
import { formatarDiaIso, semanaIso } from "@/shared/lib/utils";
import { toast } from "@/shared/lib/toast";

vi.mock("../api/projetos.api", () => ({
  projetosApi: { obter: vi.fn(), listar: vi.fn() }, casosTesteApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), transferirParaBackup: vi.fn() },
  formFactorApi: { listar: vi.fn(), listarResultados: vi.fn(), criarRodadaManual: vi.fn(), importar: vi.fn() }, modelosDispositivoApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { membros: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const projeto = { id: "project-1", unidade_id: "unit-1", time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created" as const, ativo: true, created_at: null, updated_at: null };
const casos = [
  { id: "case-1", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_001", category: "A" as const, difficulty: "Low" as const, situation: "New" as const, status: "To-Do" as const, responsavel_id: "user-1", backup_id: "backup-1", ativo: true, created_at: null, updated_at: null },
  { id: "case-2", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_002", category: "B" as const, difficulty: "Medium" as const, situation: "New Step" as const, status: "Pass" as const, responsavel_id: "user-2", backup_id: null, ativo: true, created_at: null, updated_at: null },
];
// Literal de propósito: a ordem do progresso é requisito (spec 017).
const ROTULOS_STATUS = ["To-Do", "In Progress", "In Review", "In Validation", "Pass", "Fail"];
const perfil: PerfilAtual = {
  id: "user-1", nome: "Dev", email: "dev@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: null, perfil: "Desenvolvedor", permissoes: ["projetos.consultar", "test_cases.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: "team-1", tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderPage(currentProfile = perfil, client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  function ContextOutlet() { return <Outlet context={currentProfile} />; }
  // MemoryRouter declarativo: o createMemoryRouter navega com um Request que o jsdom rejeita.
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/projetos/project-1"]}><Routes><Route element={<ContextOutlet />}><Route path="projetos/:projetoId" element={<ProjetoDetalhePage />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}

describe("ProjetoDetalhePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 100, total_count: 1 });
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: casos, page: 1, page_size: 10, total_count: 2 });
    vi.mocked(casosTesteApi.criar).mockResolvedValue({ ...casos[0], tc_id: "Clock_003" });
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue(casos[0]);
    vi.mocked(casosTesteApi.transferirParaBackup).mockResolvedValue({ ...casos[0], responsavel_id: "backup-1", backup_id: null });
    vi.mocked(formFactorApi.listar).mockResolvedValue({ modelos: [], items: [], page: 1, page_size: 10, total_count: 0 });
    vi.mocked(formFactorApi.listarResultados).mockResolvedValue({ modelos: [], items: [], page: 1, page_size: 20, total_count: 0 });
    vi.mocked(formFactorApi.importar).mockResolvedValue({ quantidade_execucoes: 1, quantidade_resultados: 4 } as never);
    vi.mocked(timesApi.membros).mockResolvedValue([
      { id: "m1", time_id: "team-1", usuario_id: "user-1", usuario_nome: "Daniel Oliveira", usuario_user_id: "daniel-id", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m3", time_id: "team-1", usuario_id: "user-2", usuario_nome: "Outro desenvolvedor", usuario_user_id: "outro-id", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m2", time_id: "team-1", usuario_id: "backup-1", usuario_nome: "Kaique Pereira", usuario_user_id: "kaique-id", usuario_perfil: "KP", usuario_perfil_codigo: "KP", ativo: true },
    ]);
  });

  it("consulta os casos como principal ou backup sem conceder edição ao backup", async () => {
    const backup = { ...casos[1], backup_id: "user-1" };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [casos[0], backup], page: 1, page_size: 20, total_count: 2 });
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    const row = await screen.findByRole("row", { name: /Clock_002/ });
    expect(within(row).queryByRole("button", { name: /Status Clock_002/ })).not.toBeInTheDocument();
    expect(within(row).queryByRole("button", { name: /Transfer to backup/ })).not.toBeInTheDocument();
    expect(casosTesteApi.listar).toHaveBeenCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: undefined, associadosAMim: true });
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
  });

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
    expect(vi.mocked(casosTesteApi.transferirParaBackup).mock.calls[0][0]).toBe("case-1");

    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    expect(await screen.findByRole("option", { name: "daniel-id" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "outro-id" })).toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: "outro-id" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: "user-2" }));
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();
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
      const dataPorExtenso = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(dia);
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

  it("permite ao responsável atualizar somente categoria, dificuldade e status do próprio caso", async () => {
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

    // TC Situation é só da gestão: o responsável vê o valor, sem controle de edição.
    expect(within(proprioCaso).queryByRole("button", { name: /TC Situation Clock_001/ })).not.toBeInTheDocument();
    expect(within(proprioCaso).getByText("New")).toBeInTheDocument();

    expect(within(proprioCaso).queryByRole("button", { name: "Edit Clock_001" })).not.toBeInTheDocument();
  });

  it("oferece In Validation entre In Review e Pass no select, no filtro e no badge, sem Data final", async () => {
    const validando = { ...casos[1], id: "case-3", tc_id: "Clock_003", status: "InValidation" as const, updated_at: "2026-10-20T12:00:00Z" };
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [...casos, validando], page: 1, page_size: 20, total_count: 3 });
    const user = userEvent.setup();
    renderPage();

    const linhaValidando = await screen.findByRole("row", { name: /Clock_003/ });
    expect(within(linhaValidando).getByText("In Validation")).toBeInTheDocument();
    const colunaDataFinal = screen.getAllByRole("columnheader").findIndex((header) => /End date/.test(header.textContent ?? ""));
    expect(linhaValidando.querySelectorAll("th, td")[colunaDataFinal]).toHaveTextContent("—");

    const proprioCaso = screen.getByRole("row", { name: /Clock_001/ });
    await user.click(within(proprioCaso).getByRole("button", { name: /Status Clock_001/ }));
    expect((await screen.findAllByRole("option")).map((option) => option.textContent)).toEqual(ROTULOS_STATUS);
    await user.click(screen.getByRole("option", { name: "In Validation" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { status: "InValidation" }));

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    expect((await screen.findAllByRole("option")).map((item) => item.textContent)).toEqual(["All", ...ROTULOS_STATUS]);
    await user.click(screen.getByRole("option", { name: "In Validation" }));
    expect(screen.getByRole("row", { name: /Clock_003/ })).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("row", { name: /Clock_002/ })).not.toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: undefined, responsavelId: undefined }));
    expect(await screen.findByRole("heading", { name: "No test cases yet" })).toBeInTheDocument();
  });

  it("apresenta resultados do Form Factor com filtros e importa relatório SDF", async () => {
    vi.mocked(formFactorApi.listar).mockResolvedValue({
      modelos: [{ id: "model-1", nome: "S27 Ultra" }],
      items: [{ caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: "user-1", sdf_id: "12837-93482", data_reportada: "2026-03-23T00:00:00Z", resultados: { "model-1": "PASS" } }],
      page: 1, page_size: 10, total_count: 1,
    });
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    const { container } = renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));

    expect(await screen.findByRole("columnheader", { name: "S27 Ultra" })).toBeInTheDocument();
    expect(screen.getByRole("row", { name: "Clock_001" })).toHaveTextContent(/Clock_001.*12837-93482.*daniel-id.*PASS/);
    expect(formFactorApi.listar).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE }));

    await user.click(within(container.querySelector("header")!).getByRole("button", { name: "Week: Select a week" }));
    await user.click(within(await screen.findByRole("dialog", { name: "Week" })).getByRole("button", { name: "This week" }));
    expect(screen.queryByRole("columnheader", { name: "One UI version" })).not.toBeInTheDocument();
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: semanaIso(new Date()), responsavelId: undefined }));

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
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", { page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE, semana: undefined, responsavelId: "user-2" }));

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput!, new File(["report"], "sdf.xlsx"));
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(formFactorApi.importar).toHaveBeenCalledWith("project-1", expect.any(File)));
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
    screen.getByRole("tab", { name: "Summary" }).focus();
    await user.keyboard("{ArrowRight}");

    await waitFor(() => expect(screen.getByRole("tab", { name: "Results" })).toHaveFocus());
    expect(await screen.findByRole("columnheader", { name: "Origin" })).toBeInTheDocument();
    expect(screen.getAllByRole("row", { name: /Clock_001/ })).toHaveLength(2);
    expect(formFactorApi.listarResultados).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1 }));
  });
});

describe("ProjetoDetalhePage: seleção e transferência em lote (spec 022)", () => {
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
    vi.mocked(casosTesteApi.transferirParaBackup).mockResolvedValue(casos[0]);
    vi.mocked(timesApi.membros).mockResolvedValue([]);
  });

  it("mostra as etiquetas de status sem a coluna de numeração", async () => {
    renderPage(dev);
    const linha = await screen.findByRole("row", { name: /Clock_101/ });
    // O Select do React Aria repete as opções num <select> nativo escondido; a etiqueta é o chip.
    const etiqueta = (linhaDoCaso: HTMLElement, texto: string) => within(linhaDoCaso).getAllByText(texto).find((elemento) => elemento.closest(".chip"));
    expect(etiqueta(linha, "To-Do")).toBeDefined();
    expect(etiqueta(screen.getByRole("row", { name: /Clock_102/ }), "In Review")).toBeDefined();
    expect(within(linha).queryByText("01")).not.toBeInTheDocument();
  });

  it("transfere os selecionados após confirmar e limpa a seleção", async () => {
    const user = userEvent.setup();
    renderPage(dev);
    await user.click(await screen.findByRole("checkbox", { name: "Select Clock_101" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Clock_102" }));
    await user.click(screen.getByRole("button", { name: "Transfer to backup (2)" }));

    const confirmacao = await screen.findByRole("alertdialog", { name: "Transfer 2 Test Cases to backup?" });
    await user.click(within(confirmacao).getByRole("button", { name: "Transfer" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("2 Test Cases transferred."));
    expect(vi.mocked(casosTesteApi.transferirParaBackup).mock.calls.map(([id]) => id).sort()).toEqual(["case-a", "case-b"]);
    expect(screen.queryByRole("button", { name: /Transfer to backup \(/ })).not.toBeInTheDocument();
  });

  it("caso sem backup tem a caixa desabilitada com o motivo", async () => {
    renderPage(dev);
    const caixa = await screen.findByRole("checkbox", { name: "Select Clock_103" });
    expect(caixa).toBeDisabled();
    expect(caixa).toHaveAccessibleDescription("This Test Case has no backup to receive it.");
  });

  it("informa a falha parcial com o TC ID que não foi transferido", async () => {
    vi.mocked(casosTesteApi.transferirParaBackup).mockImplementation(async (id) => {
      if (id === "case-b") throw new Error("409");
      return casos[0];
    });
    const user = userEvent.setup();
    renderPage(dev);
    await user.click(await screen.findByRole("checkbox", { name: "Select Clock_101" }));
    await user.click(screen.getByRole("checkbox", { name: "Select Clock_102" }));
    await user.click(screen.getByRole("button", { name: "Transfer to backup (2)" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Transfer" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("1 transferred, 1 failed: Clock_102."));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("trocar de página limpa a seleção", async () => {
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: meus, page: 1, page_size: 20, total_count: 45 });
    const user = userEvent.setup();
    renderPage(dev);
    await user.click(await screen.findByRole("checkbox", { name: "Select Clock_101" }));
    expect(screen.getByRole("button", { name: "Transfer to backup (1)" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Page 2" }));

    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenCalledWith("project-1", 2, DEFAULT_TABLE_PAGE_SIZE, expect.anything()));
    expect(screen.queryByRole("button", { name: /Transfer to backup \(/ })).not.toBeInTheDocument();
  });
});
