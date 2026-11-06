import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ModelosDispositivoPage } from "./ModelosDispositivoPage";
import { modelosDispositivoApi } from "./api/projetos.api";

vi.mock("./api/projetos.api", () => ({ modelosDispositivoApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), definirAtivo: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const perfil: PerfilAtual = {
  id: "admin", nome: "Admin", email: "admin@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "pt-BR",
};

function renderPage(currentProfile = perfil) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function ContextOutlet() { return <Outlet context={currentProfile} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "modelos-dispositivo", element: <ModelosDispositivoPage /> }] }], { initialEntries: ["/modelos-dispositivo"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("ModelosDispositivoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(modelosDispositivoApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 100, total_count: 0 });
    vi.mocked(modelosDispositivoApi.criar).mockResolvedValue({ id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra", ativo: true });
  });

  it("cria um modelo de dispositivo pelo formulário", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole("button", { name: /New device model/i }));
    await user.type(screen.getByLabelText("Model name"), "S27 Ultra");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(modelosDispositivoApi.criar).toHaveBeenCalledWith("S27 Ultra"));
  });

  it("edita e inativa um modelo existente", async () => {
    vi.mocked(modelosDispositivoApi.listar).mockResolvedValue({
      items: [{ id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra", ativo: true }],
      page: 1, page_size: 100, total_count: 1,
    });
    vi.mocked(modelosDispositivoApi.atualizar).mockResolvedValue({ id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra FE", ativo: true });
    vi.mocked(modelosDispositivoApi.definirAtivo).mockResolvedValue({ id: "model-1", unidade_id: "unit-1", nome: "S27 Ultra FE", ativo: false });
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const name = screen.getByLabelText("Model name");
    await user.clear(name);
    await user.type(name, "S27 Ultra FE");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(modelosDispositivoApi.atualizar).toHaveBeenCalledWith("model-1", { nome: "S27 Ultra FE" }));

    await user.click(await screen.findByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(modelosDispositivoApi.definirAtivo).toHaveBeenCalledWith("model-1", false));
  });

  it("nega acesso de gerenciamento a perfis sem permissão", async () => {
    const developer = { ...perfil, perfil_codigo: null, perfil: "Desenvolvedor", permissoes: [] };
    renderPage(developer);

    expect(await screen.findByRole("alert")).toHaveTextContent("You do not have permission to view this page.");
    expect(modelosDispositivoApi.listar).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /New device model/i })).not.toBeInTheDocument();
  });
});
