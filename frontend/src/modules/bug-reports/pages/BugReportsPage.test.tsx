import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";
import { casosTesteApi, projetosApi } from "@/modules/projetos/api/projetos.api";
import { timesApi } from "@/modules/times/api/times.api";
import { toast } from "@/shared/lib/toast";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";

import { bugReportsApi } from "../api/bug-reports.api";
import type { FalhaAberta } from "../model/bug-report";
import { BugReportsPage } from "./BugReportsPage";

vi.mock("../api/bug-reports.api", () => ({ bugReportsApi: { listar: vi.fn() } }));
vi.mock("@/modules/projetos/api/projetos.api", () => ({ projetosApi: { listar: vi.fn() }, casosTesteApi: { atualizar: vi.fn() } }));
vi.mock("@/modules/times/api/times.api", () => ({ timesApi: { membros: vi.fn() } }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/lib/exportar-planilha");

const kp: PerfilAtual = {
  id: "kp", nome: "Kaique", email: "kp@example.com", unidade_id: "unit-1", unidade_nome: "Unidade",
  perfil_codigo: "KP", perfil: "KP", permissoes: ["form_factor.consultar", "test_cases.gerenciar"], times: [{ id: "time-1", nome: "QA" }], setores_gerenciados: [],
  time_atual_id: "time-1", tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};

const falha = (extra: Partial<FalhaAberta> = {}): FalhaAberta => ({
  caso_teste_id: "caso-2", tc_id: "Clock_000002", titulo: "Girar a tela", status: "InFixes", projeto_id: "clock", projeto_nome: "Clock 9.5",
  time_id: "time-1", modelo_dispositivo_id: "sm-1234", modelo_nome: "SM-1234", sdf_id: "SDF-5", motivo: "Crash ao girar a tela",
  data_execucao: "2026-11-05T09:00:00Z", responsavel_id: "bia", responsavel_identificador: "bia.s", backup_id: null, ...extra,
});
const pagina = (items: FalhaAberta[], total = items.length) => ({ items, page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: total });

function renderPage(perfil = kp) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "bug-reports", element: <BugReportsPage /> }] }], { initialEntries: ["/bug-reports"] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("BugReportsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([falha(), falha({ modelo_dispositivo_id: "s26", modelo_nome: "S26 Ultra", motivo: null, sdf_id: null })]));
    vi.mocked(timesApi.membros).mockResolvedValue([
      { usuario_id: "bia", usuario_user_id: "bia.s", usuario_nome: "Bia", ativo: true },
      { usuario_id: "ana", usuario_user_id: "ana.s", usuario_nome: "Ana", ativo: true },
      { usuario_id: "rafa", usuario_user_id: "rafa.l", usuario_nome: "Rafael", ativo: false },
    ] as never);
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [{ id: "clock", nome: "Clock 9.5" }, { id: "camera", nome: "Camera 9.5" }], page: 1, page_size: 100, total_count: 2 } as never);
  });

  it("mostra uma linha por device com motivo, SDF ID, Status e responsável (CA-01 e CA-04)", async () => {
    renderPage();

    const linhas = await screen.findAllByRole("row", { name: /Clock_000002/ });
    expect(linhas).toHaveLength(2);
    expect(within(linhas[0]).getByText("SM-1234")).toBeInTheDocument();
    expect(within(linhas[0]).getByText("Crash ao girar a tela")).toBeInTheDocument();
    expect(within(linhas[0]).getByText("SDF-5")).toBeInTheDocument();
    expect(within(linhas[0]).getByText("In Fixes")).toBeInTheDocument();
    expect(linhas[0]).toHaveTextContent("bia.s");
    expect(within(linhas[1]).getAllByText("—")).toHaveLength(2);
    expect(bugReportsApi.listar).toHaveBeenCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, {});
  });

  it("filtra por projeto e volta para a página 1 (CA-07)", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole("row", { name: /Clock_000002/ });

    await user.click(screen.getByRole("button", { name: "Filter by Project" }));
    await user.click(await screen.findByRole("option", { name: "Camera 9.5" }));

    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, { projeto_id: "camera" }));
  });

  it("vazio sem filtro avisa que não há falhas no SDF (CA-11)", async () => {
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([]));
    renderPage();

    expect(await screen.findByText("No SDF failures")).toBeInTheDocument();
  });

  it("vazio com filtro: Clear filters volta à lista completa", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole("row", { name: /Clock_000002/ });
    vi.mocked(bugReportsApi.listar).mockResolvedValueOnce(pagina([]));

    await user.click(screen.getByRole("button", { name: "Filter by Project" }));
    await user.click(await screen.findByRole("option", { name: "Camera 9.5" }));
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenLastCalledWith(1, DEFAULT_TABLE_PAGE_SIZE, {}));
  });

  it("falha: erro da API aparece com role alert", async () => {
    vi.mocked(bugReportsApi.listar).mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the failures. Try again.");
  });

  it("o KP troca o responsável pela linha e a lista recarrega (CA-08)", async () => {
    const user = userEvent.setup();
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Change assignee Clock_000002 SM-1234/ }));
    expect(screen.queryByRole("option", { name: "rafa.l" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "ana.s" }));

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("caso-2", { responsavel_id: "ana" }));
    expect(toast.success).toHaveBeenCalledWith("Assignee changed.");
    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenCalledTimes(2));
    expect(timesApi.membros).toHaveBeenCalledWith("time-1");
  });

  it("falha: a recusa da API aparece num toast (CA-14)", async () => {
    const user = userEvent.setup();
    vi.mocked(casosTesteApi.atualizar).mockRejectedValue(new Error("O time está fora do seu escopo de projetos."));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Change assignee Clock_000002 SM-1234/ }));
    await user.click(await screen.findByRole("option", { name: "ana.s" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("O time está fora do seu escopo de projetos."));
  });

  it("falha: o dev vê o responsável sem a ação de trocar (CA-10)", async () => {
    renderPage({ ...kp, perfil_codigo: "USUARIO_PADRAO", permissoes: ["form_factor.consultar"] });

    const [linha] = await screen.findAllByRole("row", { name: /Clock_000002/ });
    expect(within(linha).getByText("bia.s")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change assignee/ })).not.toBeInTheDocument();
    expect(timesApi.membros).not.toHaveBeenCalled();
  });
});
