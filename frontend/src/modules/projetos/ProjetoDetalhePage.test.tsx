import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { ProjetoDetalhePage } from "./ProjetoDetalhePage";
import { casosTesteApi, formFactorApi, projetosApi } from "./api/projetos.api";
import { timesApi } from "@/modules/times/api/times.api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";

vi.mock("./api/projetos.api", () => ({
  projetosApi: { obter: vi.fn() }, casosTesteApi: { listar: vi.fn(), criar: vi.fn(), atualizar: vi.fn(), transferirParaBackup: vi.fn() },
  formFactorApi: { listar: vi.fn(), importar: vi.fn() }, modelosDispositivoApi: {},
}));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { membros: vi.fn() } }));

const projeto = { id: "project-1", unidade_id: "unit-1", time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created" as const, ativo: true, created_at: null, updated_at: null };
const casos = [
  { id: "case-1", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_001", category: "A" as const, difficulty: "Low" as const, situation: "To-Do" as const, responsavel_id: "user-1", backup_id: "backup-1", ativo: true, created_at: null, updated_at: null },
  { id: "case-2", unidade_id: "unit-1", projeto_id: "project-1", tc_id: "Clock_002", category: "B" as const, difficulty: "Medium" as const, situation: "Pass" as const, responsavel_id: "user-2", backup_id: null, ativo: true, created_at: null, updated_at: null },
];
const perfil: PerfilAtual = {
  id: "user-1", nome: "Dev", email: "dev@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: null, perfil: "Desenvolvedor", permissoes: ["projetos.consultar", "test_cases.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: "team-1", tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderPage(currentProfile = perfil) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function ContextOutlet() { return <Outlet context={currentProfile} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "projetos/:projetoId", element: <ProjetoDetalhePage /> }] }], { initialEntries: ["/projetos/project-1"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("ProjetoDetalhePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    HTMLElement.prototype.hasPointerCapture ??= () => false;
    HTMLElement.prototype.setPointerCapture ??= () => undefined;
    HTMLElement.prototype.releasePointerCapture ??= () => undefined;
    HTMLElement.prototype.scrollIntoView ??= () => undefined;
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: casos, page: 1, page_size: 10, total_count: 2 });
    vi.mocked(casosTesteApi.criar).mockResolvedValue({ ...casos[0], tc_id: "Clock_003" });
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue(casos[0]);
    vi.mocked(casosTesteApi.transferirParaBackup).mockResolvedValue({ ...casos[0], responsavel_id: "backup-1", backup_id: null });
    vi.mocked(formFactorApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 10, total_count: 0 });
    vi.mocked(formFactorApi.importar).mockResolvedValue({ quantidade_execucoes: 1, quantidade_resultados: 4 } as never);
    vi.mocked(timesApi.membros).mockResolvedValue([
      { id: "m1", time_id: "team-1", usuario_id: "user-1", usuario_nome: "Daniel Oliveira", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m3", time_id: "team-1", usuario_id: "user-2", usuario_nome: "Outro desenvolvedor", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
      { id: "m2", time_id: "team-1", usuario_id: "backup-1", usuario_nome: "Kaique Pereira", usuario_perfil: "KP", usuario_perfil_codigo: "KP", ativo: true },
    ]);
  });

  it("restringe edição inline e transferência aos casos atribuídos ao usuário", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await screen.findByText("Clock_001");

    expect(screen.queryByRole("button", { name: /New Test Case/i })).not.toBeInTheDocument();
    const proprioCaso = screen.getByRole("row", { name: /Clock_001/ });
    const casoAlheio = screen.getByRole("row", { name: /Clock_002/ });
    expect(within(proprioCaso).getByRole("combobox", { name: "Category Clock_001" })).toBeInTheDocument();
    expect(within(proprioCaso).getByText("Daniel Oliveira")).toBeInTheDocument();
    expect(within(proprioCaso).getByText("Kaique Pereira")).toBeInTheDocument();
    expect(within(proprioCaso).getByRole("button", { name: /Actions for Clock_001/i })).toBeInTheDocument();
    expect(within(casoAlheio).getByText("Outro desenvolvedor")).toBeInTheDocument();
    expect(within(casoAlheio).queryByRole("combobox", { name: "Category Clock_002" })).not.toBeInTheDocument();
    expect(within(casoAlheio).queryByRole("button", { name: /Actions for Clock_002/i })).not.toBeInTheDocument();

    await user.click(within(proprioCaso).getByRole("button", { name: /Actions for Clock_001/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Transferir ao backup/i }));
    expect(vi.mocked(casosTesteApi.transferirParaBackup).mock.calls[0][0]).toBe("case-1");

    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    expect(await screen.findByRole("menuitemradio", { name: "Daniel Oliveira" })).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "Outro desenvolvedor" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitemradio", { name: "Outro desenvolvedor" }));
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("project-1", 1, DEFAULT_TABLE_PAGE_SIZE, { responsavelId: "user-2" }));
    expect(screen.queryByRole("row", { name: /Clock_001/ })).not.toBeInTheDocument();
    expect(screen.getByRole("row", { name: /Clock_002/ })).toBeInTheDocument();
  });

  it("permite ao responsável atualizar somente categoria, dificuldade e situação do próprio caso", async () => {
    const user = userEvent.setup();
    renderPage();
    const proprioCaso = await screen.findByRole("row", { name: /Clock_001/ });

    await user.click(within(proprioCaso).getByRole("combobox", { name: "Category Clock_001" }));
    await user.click(await screen.findByRole("option", { name: "C" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { category: "C" }));

    await user.click(within(proprioCaso).getByRole("combobox", { name: "Difficulty Clock_001" }));
    await user.click(await screen.findByRole("option", { name: "High" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { difficulty: "High" }));

    await user.click(within(proprioCaso).getByRole("combobox", { name: "TC Situation Clock_001" }));
    await user.click(await screen.findByRole("option", { name: "In Progress" }));
    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-1", { situation: "InProgress" }));

    expect(within(proprioCaso).queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();
  });

  it("permite ao administrador criar um caso e atribuir responsável e backup do time", async () => {
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(await screen.findByRole("button", { name: /New Test Case/i }));
    const drawer = screen.getByRole("dialog");
    await user.type(within(drawer).getByLabelText("TC ID"), "Clock_003");

    const selects = within(drawer).getAllByRole("combobox");
    await user.click(selects[2]);
    await user.click(await screen.findByRole("option", { name: /Daniel Oliveira/ }));
    await user.click(selects[3]);
    await user.click(await screen.findByRole("option", { name: /Kaique Pereira/ }));
    await user.click(within(drawer).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(casosTesteApi.criar).toHaveBeenCalledWith("project-1", {
      tc_id: "Clock_003", category: "A", difficulty: "Low", responsavel_id: "user-1", backup_id: "backup-1",
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
      await user.click(within(otherCase).getByRole("button", { name: /Actions for Clock_002/i }));
      await user.click(await screen.findByRole("menuitem", { name: "Edit" }));
      const drawer = screen.getByRole("dialog");
      const selects = within(drawer).getAllByRole("combobox");
      await user.click(selects[3]);
      await user.click(await screen.findByRole("option", { name: /Daniel Oliveira/ }));
      await user.click(selects[4]);
      await user.click(await screen.findByRole("option", { name: /Kaique Pereira/ }));
      await user.click(within(drawer).getByRole("button", { name: "Save" }));
      await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("case-2", expect.objectContaining({ responsavel_id: "user-1", backup_id: "backup-1" })));
      unmount();
      vi.mocked(casosTesteApi.atualizar).mockClear();
    }
  });

  it("apresenta resultados do Form Factor com filtros e importa relatório SDF", async () => {
    vi.mocked(formFactorApi.listar).mockResolvedValue({
      items: [{ tc_id: "Clock_001", sdf_id: "12837-93482", modelo_dispositivo_id: "model-1", modelo_nome: "S27 Ultra", resultado: "PASS", data_reportada: "2026-03-23T00:00:00Z", one_ui: "9.5" }],
      page: 1, page_size: 10, total_count: 1,
    });
    const admin = { ...perfil, id: "admin", perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador" };
    const user = userEvent.setup();
    const { container } = renderPage(admin);
    await screen.findByRole("heading", { name: "Clock 9.5" });
    await user.click(screen.getByRole("tab", { name: "Form Factor" }));

    expect(await screen.findByText("S27 Ultra")).toBeInTheDocument();
    expect(screen.getByText("12837-93482")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(formFactorApi.listar).toHaveBeenCalledWith("project-1", expect.objectContaining({ page: 1, pageSize: DEFAULT_TABLE_PAGE_SIZE }));

    await user.type(screen.getByLabelText("Semana"), "2026-W12");
    await user.type(screen.getByLabelText("One UI version"), "9.5");
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("project-1", expect.objectContaining({ semana: "2026-W12", oneUi: "9.5" })));

    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();
    await user.upload(fileInput!, new File(["report"], "sdf.xlsx"));
    await user.click(screen.getByRole("button", { name: /^import$/i }));
    await waitFor(() => expect(formFactorApi.importar).toHaveBeenCalledWith("project-1", expect.any(File)));
  });
});
