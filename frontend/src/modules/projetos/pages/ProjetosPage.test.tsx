import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { formatarDiaIso } from "@/shared/lib/utils";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "@e965/xlsx";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetosPage } from "./ProjetosPage";
import { modelosDispositivoApi, projetosApi } from "../api/projetos.api";
import { lerPlanilhaProjeto } from "../utils/planilha-projeto";
import { timesApi } from "@/modules/times/api/times.api";
import { ApiError } from "@/shared/api/problem-details";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../api/projetos.api", () => ({
  projetosApi: { listar: vi.fn(), criar: vi.fn(), importar: vi.fn(), atualizarStatus: vi.fn(), atualizar: vi.fn() },
  modelosDispositivoApi: { listarOpcoes: vi.fn() },
  casosTesteApi: {}, formFactorApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { listar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: toastMock }));
vi.mock("@/shared/lib/exportar-planilha");

const perfil: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};

function planilhaFile() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
    ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
  ]), "Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "casos.xlsx");
}

function novoQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

function renderPage(queryClient = novoQueryClient()) {
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "projetos", element: <ProjetosPage /> }] }], { initialEntries: ["/projetos"] });
  return render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("ProjetosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 10, total_count: 0 });
    vi.mocked(projetosApi.criar).mockResolvedValue({ id: "new-project" } as never);
    vi.mocked(timesApi.listar).mockResolvedValue({ items: [{ id: "team-1", nome: "Plataforma", ativo: true }], page: 1, page_size: 100, total_count: 1 } as never);
    vi.mocked(modelosDispositivoApi.listarOpcoes).mockResolvedValue({ items: [{ id: "model-1", nome: "S27 Ultra", descricao: "Flagship" }], page: 1, page_size: 100, total_count: 1 });
  });

  it("cria projeto manual derivando o nome do App e One UI e associa o time/modelo", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.click(screen.getByRole("tab", { name: "Manual" }));
    await user.type(screen.getByLabelText("App"), "Clock");
    await user.type(screen.getByLabelText(/One UI/i), "9.5");

    await user.click(within(document.getElementById("project-manual-panel")!).getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));

    await user.click(screen.getByRole("button", { name: "Device models" }));
    await user.click(await screen.findByRole("option", { name: "S27 Ultra Flagship" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(projetosApi.criar).toHaveBeenCalledWith({ time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", modelos_ids: ["model-1"] }));
    expect(modelosDispositivoApi.listarOpcoes).toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "Device models" })).not.toBeInTheDocument();
  });

  it("lista projetos com time, aplicativo, versão e status", async () => {
    vi.mocked(projetosApi.listar).mockResolvedValue({
      items: [{ id: "project-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created", ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" }],
      page: 1, page_size: 10, total_count: 1,
    });
    renderPage();

    expect(await screen.findByRole("link", { name: "Clock 9.5" })).toBeInTheDocument();
    expect(screen.getByText("Plataforma")).toBeInTheDocument();
    expect(screen.getByText("Clock")).toBeInTheDocument();
    expect(screen.getByText("9.5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Status for Clock 9.5/ })).toHaveTextContent("Created");
  });

  it("exportar todos busca todas as páginas e aplica os filtros locais, sem número nem ações", async () => {
    const base = { app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", modelos_dispositivo: ["S27 Ultra", "Tab S11"] };
    const clock = { ...base, id: "project-1", nome: "Clock 9.5" };
    const notes = { ...base, id: "project-2", nome: "Notes 9.5", app: "Notes" };
    const clockAntigo = { ...base, id: "project-3", nome: "Clock 9.0", one_ui: "9.0", status: "Completed" as const, updated_at: null };
    vi.mocked(projetosApi.listar).mockImplementation(async (page, pageSize) => ({ items: pageSize === 100 ? [clock, notes, clockAntigo] : [clock, notes], page: page ?? 1, page_size: pageSize ?? 20, total_count: 3 }));
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole("link", { name: "Notes 9.5" });
    await user.click(screen.getByRole("button", { name: "Filter by App" }));
    await user.type(await screen.findByRole("searchbox", { name: "App" }), "clock");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(screen.queryByRole("link", { name: "Notes 9.5" })).not.toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^projetos_/)));
    expect(projetosApi.listar).toHaveBeenCalledWith(1, 100);
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(itens).toEqual([clock, clockAntigo]);
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["Project", "Team", "App", "One UI Version", "Device models", "Status", "Created", "Updated", "Planned date"]);
    expect(colunas.map((coluna) => coluna.valor(clockAntigo)).slice(0, 6)).toEqual(["Clock 9.0", "Plataforma", "Clock", "9.0", "S27 Ultra, Tab S11", "Completed"]);
    // Projeto nunca editado: sem data de atualização.
    const coluna = (titulo: string) => colunas.find((item) => item.titulo === titulo);
    expect(coluna("Updated")?.valor(clockAntigo)).toBe("—");
    expect(coluna("Updated")?.valor(clock)).not.toBe("—");
    // Sem data planejada, a coluna mostra o traço (spec 071, RN-03).
    expect(coluna("Planned date")?.valor(clock)).toBe("—");
  });

  it("filtra os projetos pela data de atualização escolhida no calendário", async () => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0);
    const base = { app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z" };
    vi.mocked(projetosApi.listar).mockResolvedValue({
      items: [{ ...base, id: "project-1", nome: "Clock 9.5", updated_at: hoje.toISOString() }, { ...base, id: "project-2", nome: "Notes 9.5", updated_at: null }],
      page: 1, page_size: 20, total_count: 2,
    });
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("link", { name: "Notes 9.5" });

    await user.click(screen.getByRole("button", { name: /Filter by Updated/i }));
    const calendario = await screen.findByRole("dialog", { name: /Updated/i });
    // O calendário (spec 050) usa o ordinal no rótulo do dia: "Friday, October 30th, 2026".
    const dataPorExtenso = `${hoje.toLocaleString("en-US", { month: "long" })} ${hoje.getDate()}(st|nd|rd|th)?, ${hoje.getFullYear()}`;
    await user.click(within(calendario).getByRole("button", { name: new RegExp(dataPorExtenso) }));

    expect(screen.getByRole("link", { name: "Clock 9.5" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Notes 9.5" })).not.toBeInTheDocument();
  });

  it("altera o status pela linha mesmo com o detalhe de um projeto no cache", async () => {
    const projeto = { id: "project-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" };
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 20, total_count: 1 });
    vi.mocked(projetosApi.atualizarStatus).mockResolvedValue({ ...projeto, status: "InProgress" });
    const queryClient = novoQueryClient();
    // O detalhe também começa com "projetos" na queryKey e não tem `items`: o update otimista não pode tocar nele.
    queryClient.setQueryData(["projetos", "detalhe", "project-1"], projeto);
    const user = userEvent.setup();
    renderPage(queryClient);

    await user.click(await screen.findByRole("button", { name: /Status for Clock 9.5/ }));
    await user.click(await screen.findByRole("option", { name: "In Progress" }));

    await waitFor(() => expect(projetosApi.atualizarStatus).toHaveBeenCalledWith("project-1", "InProgress"));
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("pede confirmação antes de marcar o projeto como cancelado", async () => {
    const projeto = { id: "project-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" };
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 20, total_count: 1 });
    vi.mocked(projetosApi.atualizarStatus).mockResolvedValue({ ...projeto, status: "Canceled" });
    const user = userEvent.setup();
    renderPage();

    // Cancelar a confirmação não grava nada.
    await user.click(await screen.findByRole("button", { name: /Status for Clock 9.5/ }));
    await user.click(await screen.findByRole("option", { name: "Canceled" }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Mark Clock 9.5 as Canceled?" })).getByRole("button", { name: "Cancel" }));
    expect(projetosApi.atualizarStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Status for Clock 9.5/ }));
    await user.click(await screen.findByRole("option", { name: "Canceled" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Change status" }));
    await waitFor(() => expect(projetosApi.atualizarStatus).toHaveBeenCalledWith("project-1", "Canceled"));
  });

  it("avisa quando o servidor recusa a troca de status", async () => {
    const projeto = { id: "project-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" };
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 20, total_count: 1 });
    vi.mocked(projetosApi.atualizarStatus).mockRejectedValue(new Error("403"));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Status for Clock 9.5/ }));
    await user.click(await screen.findByRole("option", { name: "In Progress" }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Could not update the project status."));
  });

  it("recusa concluir com Test Cases pendentes e mostra quantos faltam", async () => {
    const projeto = { id: "project-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-1", status: "Created" as const, ativo: true, unidade_id: "unit-1", created_at: "2026-05-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z" };
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [projeto], page: 1, page_size: 20, total_count: 1 });
    vi.mocked(projetosApi.atualizarStatus).mockRejectedValue(new ApiError({
      type: "about:blank", title: "Conflito.", status: 409,
      errors: [{ campo: "status", mensagem: "x", codigo: "projeto_com_casos_pendentes", parametros: { quantidade: 2 } }],
    }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Status for Clock 9.5/ }));
    await user.click(await screen.findByRole("option", { name: "Completed" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Change status" }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("2 Test Cases are not Done or Cancelled yet. Fix them before completing the project."));
  });

  it("apresenta os erros de validação associados às linhas da planilha", async () => {
    vi.mocked(projetosApi.importar).mockRejectedValue(new ApiError({
      type: "about:blank", title: "Planilha inválida", status: 422,
      total_linhas: 4,
      errors: [{ campo: "linha.3.assignees", mensagem: "x", codigo: "pessoa_fora_do_time", linha: 3, coluna: "Assignees", valor: "Rafael Lima" }],
    }));
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput!, planilhaFile());
    expect(await screen.findByRole("region", { name: "Test Case preview" })).toBeInTheDocument();
    expect(screen.getByText("Clock_001")).toBeInTheDocument();
    await user.click(within(document.getElementById("project-import-panel")!).getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("1 of 4 rows needs changes. Nothing was created.");
    expect(alerta).toHaveTextContent('Row 3Assignees column: "Rafael Lima" isn\'t an active member of the selected team.');
    expect(alerta).not.toHaveTextContent("linha.3");
  });

  it("bloqueia o envio quando o arquivo não é uma planilha válida", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.upload(container.querySelector('input[type="file"]')!, new File(["invalid"], "invalid.xlsx"));

    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Whole spreadsheet");
    expect(alerta).toHaveTextContent("The header is missing the TC Situation column.");
    expect(alerta).not.toHaveTextContent("linha.1");
    expect(screen.getByRole("button", { name: "Check spreadsheet" })).toBeDisabled();
    expect(projetosApi.importar).not.toHaveBeenCalled();
  });

  it("com problemas na prévia, confere a planilha no servidor e mostra também os problemas de pessoas", async () => {
    vi.mocked(projetosApi.importar).mockRejectedValue(new ApiError({
      type: "about:blank", title: "Planilha inválida.", status: 422, total_linhas: 1,
      errors: [
        { campo: "linha.2.tc situation", mensagem: "x", codigo: "valor_invalido", linha: 2, coluna: "TC Situation", valor: "To-Do", parametros: { esperados: ["New", "New Step", "Without Changes"] } },
        { campo: "linha.2.assignees", mensagem: "x", codigo: "pessoa_fora_do_time", linha: 2, coluna: "Assignees", valor: "Daniel Oliveira" },
      ],
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "To-Do", "9.5", "Daniel Oliveira", "Kaique Pereira"],
    ]), "Cases");
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.upload(container.querySelector('input[type="file"]')!, new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "casos.xlsx"));
    expect(await screen.findByRole("alert")).not.toHaveTextContent("Assignees column");
    await user.click(within(document.getElementById("project-import-panel")!).getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));
    await user.click(screen.getByRole("button", { name: "Check spreadsheet" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent('Assignees column: "Daniel Oliveira" isn\'t an active member of the selected team.'));
    expect(screen.getByRole("alert")).toHaveTextContent('TC Situation column: "To-Do" isn\'t valid.');
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("mostra quantos casos foram criados ao importar a planilha", async () => {
    vi.mocked(projetosApi.importar).mockResolvedValue({ projeto: { id: "project-1", nome: "Clock 9.5" } as never, quantidade_casos: 4 });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.upload(container.querySelector('input[type="file"]')!, planilhaFile());
    // O botão só libera depois que a barra enche e a prévia aparece (spec 016, RN-12).
    await screen.findByRole("region", { name: "Test Case preview" });
    await user.click(within(document.getElementById("project-import-panel")!).getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(projetosApi.importar).toHaveBeenCalledWith(expect.any(File), "team-1", [], "Clock", "9.5"));
    expect(toastMock.success).toHaveBeenCalledWith("Spreadsheet imported: 4 Test Cases created in Clock 9.5.");
  });

  it("remove a planilha lida, avisa a remoção e volta o card do modelo", async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.upload(container.querySelector('input[type="file"]')!, planilhaFile());
    await screen.findByRole("region", { name: "Test Case preview" });

    await user.click(screen.getByRole("button", { name: "Remove file" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Test Case preview" })).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: /Download template/i })).toBeInTheDocument();
    expect(toastMock.success).toHaveBeenCalledWith("Spreadsheet removed");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("baixa o modelo de planilha com TC Situation New e sem coluna de Status", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.click(screen.getByRole("button", { name: /Download template/i }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), "template-projeto-test-cases.xlsx"));
    const [bytes] = vi.mocked(baixarPlanilha).mock.calls[0];
    const workbook = XLSX.read(bytes, { type: "array" });
    const [cabecalho, exemplo] = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    expect(cabecalho).toEqual([
      "App", "TC ID", "Title(English)", "Test Precondition(English)", "Test Procedure(English)", "Expected Result(English)",
      "Difficulty", "Category", "Automation Level", "TC Situation", "One UI", "Assignees", "Backup",
    ]);
    expect(cabecalho).not.toContain("Status");
    expect(exemplo).toHaveLength(cabecalho.length);
    expect(exemplo[cabecalho.indexOf("TC Situation")]).toBe("New");
    expect(String(exemplo[cabecalho.indexOf("Automation Level")])).toBe("1");
    // O modelo baixado volta a ser lido sem erro quando as pessoas são preenchidas (cabeçalho e exemplo andam juntos).
    const arquivo = new File([bytes], "modelo.xlsx");
    await expect(lerPlanilhaProjeto(arquivo)).resolves.toMatchObject({ app: "Clock", one_ui: "9.5", totalLinhas: 1 });
  });

  it("no cadastro, só o modo escolhido fica na tela: um campo Team por vez (spec 031)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.click(screen.getByRole("tab", { name: "Manual" }));

    expect(screen.getAllByText("Team")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Team/ })).toHaveTextContent("Select a team");
    expect(document.getElementById("project-import-panel")).toBeNull();
  });

  describe("painel de editar projeto (spec 031)", () => {
    const clock = { id: "project-1", unidade_id: "unit-1", time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created", ativo: true, modelos_ids: ["model-1"], modelos_dispositivo: ["S27 Ultra"], created_at: null, updated_at: null };

    beforeEach(() => {
      vi.mocked(projetosApi.listar).mockResolvedValue({ items: [clock], page: 1, page_size: 20, total_count: 1 } as never);
      vi.mocked(timesApi.listar).mockResolvedValue({ items: [{ id: "team-1", nome: "Plataforma", ativo: true }, { id: "team-2", nome: "Suporte", ativo: true }], page: 1, page_size: 100, total_count: 2 } as never);
      vi.mocked(modelosDispositivoApi.listarOpcoes).mockResolvedValue({ items: [{ id: "model-1", nome: "S27 Ultra", descricao: "Flagship" }, { id: "model-2", nome: "Tab S11", descricao: null }], page: 1, page_size: 100, total_count: 2 });
    });

    async function abrirEdicao(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: "Edit project Clock 9.5" }));
      const painel = await screen.findByRole("dialog");
      expect(within(painel).getByRole("heading", { name: "Edit project · Clock 9.5" })).toBeInTheDocument();
      return painel;
    }

    async function trocarTimeEModelos(user: ReturnType<typeof userEvent.setup>, painel: HTMLElement) {
      await user.click(within(painel).getByRole("button", { name: /Team/ }));
      await user.click(await screen.findByRole("option", { name: "Suporte" }));
      await user.click(within(painel).getByRole("button", { name: "Remove S27 Ultra" }));
      await user.click(within(painel).getByRole("button", { name: "Device models" }));
      await user.click(await screen.findByRole("option", { name: "Tab S11" }));
      await user.keyboard("{Escape}");
    }

    it("troca o time e os modelos, salva e fecha", async () => {
      vi.mocked(projetosApi.atualizar).mockResolvedValue({ ...clock, time_id: "team-2" } as never);
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEdicao(user);
      await trocarTimeEModelos(user, painel);
      await user.click(within(painel).getByRole("button", { name: "Save" }));

      await waitFor(() => expect(projetosApi.atualizar).toHaveBeenCalledWith("project-1", { nome: "Clock 9.5", app: "Clock", one_ui: "9.5", time_id: "team-2", modelos_ids: ["model-2"], data_planejada: null }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(toastMock.success).toHaveBeenCalledWith("Project updated.");
    });

    it("falha: a API recusa a troca de time e o painel continua aberto com os valores escolhidos", async () => {
      vi.mocked(projetosApi.atualizar).mockRejectedValue(new Error("Há responsáveis fora do time de destino."));
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEdicao(user);
      await trocarTimeEModelos(user, painel);
      await user.click(within(painel).getByRole("button", { name: "Save" }));

      await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Could not update the project."));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(within(painel).getByRole("button", { name: /Team/ })).toHaveTextContent("Suporte");
    });

    it("define a data planejada e a lista mostra a data na coluna Planned date (spec 071, CA-01)", async () => {
      vi.mocked(projetosApi.atualizar).mockResolvedValue({ ...clock, data_planejada: "2099-12-19" } as never);
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEdicao(user);
      await user.click(within(painel).getByRole("button", { name: /Planned date/ }));
      await user.click(await screen.findByRole("button", { name: "Today" }));
      expect(within(painel).getByRole("button", { name: /Planned date/ })).not.toHaveTextContent("Select a date");
      vi.mocked(projetosApi.listar).mockResolvedValue({ items: [{ ...clock, data_planejada: "2099-12-19" }], page: 1, page_size: 20, total_count: 1 } as never);
      await user.click(within(painel).getByRole("button", { name: "Save" }));

      await waitFor(() => expect(projetosApi.atualizar).toHaveBeenCalledWith("project-1", expect.objectContaining({ data_planejada: formatarDiaIso(new Date()) })));
      await waitFor(() => expect(screen.getByRole("row", { name: /Clock 9.5/ })).toHaveTextContent("12/19/2099"));
    });

    it("falha: data planejada no passado mostra o erro e não deixa salvar (spec 071, CA-10)", async () => {
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEdicao(user);
      await user.click(within(painel).getByRole("button", { name: /Planned date/ }));
      await user.click(await screen.findByRole("button", { name: /previous month/i }));
      await user.click(screen.getAllByRole("button", { name: /15th/ })[0]);

      expect(await within(painel).findByText("The planned date can't be in the past.")).toBeInTheDocument();
      expect(within(painel).getByRole("button", { name: "Save" })).toBeDisabled();
      expect(projetosApi.atualizar).not.toHaveBeenCalled();
    });

    it("fecha com Esc sem salvar e reabre com os dados salvos", async () => {
      const user = userEvent.setup();
      renderPage();

      const painel = await abrirEdicao(user);
      const nome = within(painel).getByRole("textbox", { name: "Project name" });
      await user.clear(nome);
      await user.type(nome, "Rascunho");
      await user.keyboard("{Escape}");

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(projetosApi.atualizar).not.toHaveBeenCalled();
      const reaberto = await abrirEdicao(user);
      expect(within(reaberto).getByRole("textbox", { name: "Project name" })).toHaveValue("Clock 9.5");
    });
  });
});
