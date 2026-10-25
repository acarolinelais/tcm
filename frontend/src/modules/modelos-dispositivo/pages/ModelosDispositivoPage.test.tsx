import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { ApiError } from "@/shared/api/problem-details";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";

import { modelosDispositivoApi } from "../api/modelos-dispositivo.api";
import type { ModeloDispositivo } from "../model/modelo-dispositivo";
import { ModelosDispositivoPage } from "./ModelosDispositivoPage";

vi.mock("../api/modelos-dispositivo.api", () => ({
  modelosDispositivoApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), ativar: vi.fn(), inativar: vi.fn() },
}));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const kp: PerfilAtual = {
  id: "kp", nome: "KP", email: "kp@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "KP", perfil: "KP", permissoes: ["projetos.gerenciar", "modelos_dispositivo.gerenciar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

const s27: ModeloDispositivo = {
  id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra", descricao: "Flagship", ativo: true,
  created_at: "2026-10-01T12:00:00", updated_at: "2026-10-02T12:00:00",
};
const tab: ModeloDispositivo = { ...s27, id: "model-2", nome: "Tab S11", descricao: null, ativo: false };
const pagina = (items: ModeloDispositivo[], total = items.length) => ({ items, page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: total });

function renderPage(perfil = kp) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "admin/modelos-dispositivo", element: <ModelosDispositivoPage /> }] }], { initialEntries: ["/admin/modelos-dispositivo"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

async function acao(user: ReturnType<typeof userEvent.setup>, modelo: string, nome: string) {
  await user.click(await screen.findByRole("button", { name: `Actions for ${modelo}` }));
  await user.click(screen.getByRole("menuitem", { name: nome }));
}

describe("ModelosDispositivoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(modelosDispositivoApi.listar).mockResolvedValue(pagina([s27, tab]));
  });

  it("lista os modelos com descrição, status e datas, 20 por página", async () => {
    renderPage();

    const linha = (await screen.findByText("S27 Ultra")).closest("tr")!;
    expect(within(linha).getByText("Flagship")).toBeInTheDocument();
    expect(within(linha).getByText(formatDate(s27.created_at!))).toBeInTheDocument();
    expect(within(screen.getByText("Tab S11").closest("tr")!).getByText("—")).toBeInTheDocument();
    expect(within(screen.getByText("Tab S11").closest("tr")!).getByText("Inactive")).toBeInTheDocument();
    expect(modelosDispositivoApi.listar).toHaveBeenCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, {});
  });

  it("cria um modelo com nome e descrição", async () => {
    vi.mocked(modelosDispositivoApi.criar).mockResolvedValue(s27);
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "New device model" }));
    await user.type(screen.getByLabelText("Model name"), "S27 Ultra");
    await user.type(screen.getByLabelText("Description"), "Flagship");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(modelosDispositivoApi.criar).toHaveBeenCalledWith({ nome: "S27 Ultra", descricao: "Flagship" }));
  });

  it("não envia o formulário sem nome e mostra o erro no campo", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "New device model" }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("This field is required.")).toBeInTheDocument();
    expect(modelosDispositivoApi.criar).not.toHaveBeenCalled();
  });

  it("mostra no campo o nome duplicado recusado pelo servidor", async () => {
    vi.mocked(modelosDispositivoApi.criar).mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflict", status: 409 }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "New device model" }));
    await user.type(screen.getByLabelText("Model name"), "S27 Ultra");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("A model with this name already exists.")).toBeInTheDocument();
  });

  it("marca no campo a descrição recusada pela validação do servidor", async () => {
    vi.mocked(modelosDispositivoApi.criar).mockRejectedValue(new ApiError({
      type: "about:blank", title: "Unprocessable", status: 422,
      errors: [{ campo: "body.descricao", mensagem: "String should have at most 100 characters" }],
    }));
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "New device model" }));
    await user.type(screen.getByLabelText("Model name"), "S27 Ultra");
    await user.type(screen.getByLabelText("Description"), "Flagship");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Use up to 100 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toHaveAttribute("aria-invalid", "true");
  });

  it("edita nome e descrição de um modelo", async () => {
    vi.mocked(modelosDispositivoApi.atualizar).mockResolvedValue({ ...s27, descricao: null });
    const user = userEvent.setup();
    renderPage();

    await acao(user, "S27 Ultra", "Edit");
    const descricao = screen.getByLabelText("Description");
    expect(descricao).toHaveValue("Flagship");
    await user.clear(descricao);
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(modelosDispositivoApi.atualizar).toHaveBeenCalledWith("model-1", { nome: "S27 Ultra", descricao: "" }));
  });

  it("inativa com confirmação e reativa sem confirmação", async () => {
    vi.mocked(modelosDispositivoApi.inativar).mockResolvedValue({ ...s27, ativo: false });
    vi.mocked(modelosDispositivoApi.ativar).mockResolvedValue({ ...tab, ativo: true });
    const user = userEvent.setup();
    renderPage();

    await acao(user, "S27 Ultra", "Deactivate");
    expect(modelosDispositivoApi.inativar).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(modelosDispositivoApi.inativar).toHaveBeenCalledWith("model-1"));

    await acao(user, "Tab S11", "Activate");
    await waitFor(() => expect(modelosDispositivoApi.ativar).toHaveBeenCalledWith("model-2"));
  });

  it("filtra por status voltando à página 1 e limpa o filtro quando nada corresponde", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("S27 Ultra");
    vi.mocked(modelosDispositivoApi.listar).mockResolvedValue(pagina([]));

    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Inactive" }));

    await waitFor(() => expect(modelosDispositivoApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, { ativo: false }));
    expect(await screen.findByText("No models match the selected filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(modelosDispositivoApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, {}));
  });

  it("mostra o estado de erro quando a listagem falha", async () => {
    vi.mocked(modelosDispositivoApi.listar).mockRejectedValue(new Error("falhou"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the models.");
  });

  it("nega acesso ao gerente sem carregar o catálogo", async () => {
    renderPage({ ...kp, perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["projetos.gerenciar"] });

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to view this page.");
    expect(modelosDispositivoApi.listar).not.toHaveBeenCalled();
  });
});
