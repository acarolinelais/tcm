import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "@e965/xlsx";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetosPage } from "./ProjetosPage";
import { modelosDispositivoApi, projetosApi } from "../api/projetos.api";
import { timesApi } from "@/modules/times/api/times.api";
import { ApiError } from "@/shared/api/problem-details";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("../api/projetos.api", () => ({
  projetosApi: { listar: vi.fn(), criar: vi.fn(), importar: vi.fn(), atualizarStatus: vi.fn() },
  modelosDispositivoApi: { listarOpcoes: vi.fn() },
  casosTesteApi: {}, formFactorApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { listar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: toastMock }));

const perfil: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function planilhaFile() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
    ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
  ]), "Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "casos.xlsx");
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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
    expect(screen.getAllByText("Created")).toHaveLength(2);
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
    let blob: Blob | undefined;
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn((arquivo: Blob) => { blob = arquivo; return "blob:modelo"; }), revokeObjectURL: vi.fn() });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.click(screen.getByRole("button", { name: /Download template/i }));

    await waitFor(() => expect(blob).toBeDefined());
    // O Blob do jsdom não tem arrayBuffer(); o FileReader tem.
    const bytes = await new Promise<ArrayBuffer>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob!);
    });
    const workbook = XLSX.read(bytes, { type: "array" });
    const [cabecalho, exemplo] = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
    expect(cabecalho).toContain("TC Situation");
    expect(cabecalho).not.toContain("Status");
    expect(exemplo[cabecalho.indexOf("TC Situation")]).toBe("New");
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
