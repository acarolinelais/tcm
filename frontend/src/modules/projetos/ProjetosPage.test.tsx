import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetosPage } from "./ProjetosPage";
import { modelosDispositivoApi, projetosApi } from "./api/projetos.api";
import { timesApi } from "@/modules/times/api/times.api";
import { ApiError } from "@/shared/api/problem-details";

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock("./api/projetos.api", () => ({
  projetosApi: { listar: vi.fn(), criar: vi.fn(), importar: vi.fn(), atualizarStatus: vi.fn() },
  modelosDispositivoApi: { listar: vi.fn() },
  casosTesteApi: {}, formFactorApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { listar: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: toastMock }));

const perfil: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "projetos", element: <ProjetosPage /> }] }], { initialEntries: ["/projetos"] });
  return render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("ProjetosPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.hasPointerCapture ??= () => false;
    HTMLElement.prototype.setPointerCapture ??= () => undefined;
    HTMLElement.prototype.releasePointerCapture ??= () => undefined;
    HTMLElement.prototype.scrollIntoView ??= () => undefined;
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 10, total_count: 0 });
    vi.mocked(projetosApi.criar).mockResolvedValue({ id: "new-project" } as never);
    vi.mocked(timesApi.listar).mockResolvedValue({ items: [{ id: "team-1", nome: "Plataforma", ativo: true }], page: 1, page_size: 100, total_count: 1 } as never);
    vi.mocked(modelosDispositivoApi.listar).mockResolvedValue({ items: [{ id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra", ativo: true }], page: 1, page_size: 100, total_count: 1 });
  });

  it("cria projeto manual derivando o nome do App e One UI e associa o time/modelo", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.click(screen.getByRole("tab", { name: /Create manually/i }));
    await user.type(screen.getByLabelText("App"), "Clock");
    await user.type(screen.getByLabelText(/One UI/i), "9.5");

    await user.click(screen.getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));

    await user.click(screen.getByRole("button", { name: "Device models" }));
    await user.click(await screen.findByRole("option", { name: "S27 Ultra" }));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(projetosApi.criar).toHaveBeenCalledWith({ time_id: "team-1", app: "Clock", one_ui: "9.5", modelos_ids: ["model-1"] }));
    expect(modelosDispositivoApi.listar).toHaveBeenCalledWith(1, 100, true);
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
      errors: [{ campo: "linha.3.tc id", mensagem: "TC ID duplicado na planilha." }],
    }));
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput!, new File(["planilha"], "casos.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    await user.click(screen.getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("linha.3.tc id: TC ID duplicado na planilha.");
  });

  it("mostra quantos casos foram criados ao importar a planilha", async () => {
    vi.mocked(projetosApi.importar).mockResolvedValue({ projeto: { id: "project-1", nome: "Clock 9.5" } as never, quantidade_casos: 4 });
    const user = userEvent.setup();
    const { container } = renderPage();
    await user.click(await screen.findByRole("button", { name: /New project/i }));
    await user.upload(container.querySelector('input[type="file"]')!, new File(["planilha"], "casos.xlsx"));
    await user.click(screen.getByLabelText("Team"));
    await user.click(await screen.findByRole("option", { name: "Plataforma" }));
    await user.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() => expect(projetosApi.importar).toHaveBeenCalledWith(expect.any(File), "team-1", [], "", ""));
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("4"));
  });
});
