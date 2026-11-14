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
import type { CasoComFalhas, FalhaSdf } from "../model/bug-report";
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

const falha = (extra: Partial<FalhaSdf> = {}): FalhaSdf => ({
  modelo_dispositivo_id: "sm-1234", modelo_nome: "SM-1234", sdf_id: "SDF-5", resultado: "FAIL",
  descricao: "Crash ao girar a tela", data_execucao: "2026-11-05T09:00:00Z", ...extra,
});
const caso = (extra: Partial<CasoComFalhas> = {}): CasoComFalhas => ({
  caso_teste_id: "caso-2", tc_id: "Clock_000002", status: "To-Do", time_id: "time-1", responsavel_id: "bia",
  responsavel_identificador: "bia.s", backup_id: null, dev_fix_id: null, dev_fix_identificador: null, tentativa_correcao: 0, correcao_em_revisao_em: null,
  falhas: [falha({ modelo_nome: "S26 Ultra", sdf_id: "SDF-6", resultado: "EXCEPTION", descricao: null, data_execucao: "2026-11-06T09:00:00Z" }), falha()],
  ...extra,
});
const pagina = (items: CasoComFalhas[]) => ({ items, page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: items.length });

function renderPage(perfil = kp, rota = "/bug-reports") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter([{ path: "/", element: <ContextOutlet />, children: [{ path: "bug-reports", element: <BugReportsPage /> }] }], { initialEntries: [rota] });
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("BugReportsPage (SDF Failures)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([caso()]));
    vi.mocked(timesApi.membros).mockResolvedValue([
      { usuario_id: "bia", usuario_user_id: "bia.s", usuario_nome: "Bia", ativo: true },
      { usuario_id: "ana", usuario_user_id: "ana.s", usuario_nome: "Ana", ativo: true },
      { usuario_id: "rafa", usuario_user_id: "rafa.l", usuario_nome: "Rafael", ativo: false },
    ] as never);
    vi.mocked(projetosApi.listar).mockResolvedValue({
      items: [
        { id: "clock", nome: "Clock 9.5", app: "Clock", time_id: "time-1", status: "InProgress" },
        { id: "camera", nome: "Camera 9.5", app: "Camera", time_id: "time-1", status: "InProgress" },
        { id: "antigo", nome: "Antigo 9.5", app: "Antigo", time_id: "time-1", status: "Completed" },
      ],
      page: 1, page_size: 100, total_count: 3,
    } as never);
  });

  it("mostra o selo a partir da segunda tentativa e o filtro Reincidentes vai para a API (spec 073, CA-04 e CA-11)", async () => {
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([caso({ tentativa_correcao: 2 }), caso({ caso_teste_id: "caso-3", tc_id: "Clock_000003", tentativa_correcao: 1 })]));
    const user = userEvent.setup();
    renderPage();

    const [reincidente] = await screen.findAllByRole("row", { name: /Clock_000002/ });
    expect(within(reincidente).getByText("Fix 2")).toBeInTheDocument();
    const [primeira] = screen.getAllByRole("row", { name: /Clock_000003/ });
    expect(within(primeira).queryByText(/^Fix /)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Recurring" }));
    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenLastCalledWith("clock", 1, DEFAULT_TABLE_PAGE_SIZE, { reincidentes: true }));
  });

  it("abre o primeiro projeto e mostra a falha mais recente do caso (CA-01)", async () => {
    renderPage();

    const [linha] = await screen.findAllByRole("row", { name: /Clock_000002/ });
    expect(screen.getByRole("heading", { name: "SDF Failures" })).toBeInTheDocument();
    expect(within(linha).getByText("S26 Ultra")).toBeInTheDocument();
    expect(within(linha).getByText("SDF-6")).toBeInTheDocument();
    expect(within(linha).getByText("To-Do")).toBeInTheDocument();
    expect(linha).toHaveTextContent("bia.s");
    expect(within(linha).queryByText("SM-1234")).not.toBeInTheDocument();
    expect(bugReportsApi.listar).toHaveBeenCalledWith("clock", 1, DEFAULT_TABLE_PAGE_SIZE, {});
  });

  it("a seta abre todas as falhas do caso, uma embaixo da outra (CA-05)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Show all failures of Clock_000002" }));

    const [linha] = screen.getAllByRole("row", { name: /Clock_000002/ });
    expect(within(linha).getByText("S26 Ultra")).toBeInTheDocument();
    expect(within(linha).getByText("SM-1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show all failures of Clock_000002" })).toHaveAttribute("aria-expanded", "true");
  });

  it("o botão da Description abre o texto inteiro (CA-10)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Show all failures of Clock_000002" }));
    await user.click(screen.getByRole("button", { name: /View description/ }));

    expect(await screen.findByText("Crash ao girar a tela")).toBeInTheDocument();
  });

  it("o projeto vem de ?projeto=, e projeto encerrado não entra (CA-08 e RN-06)", async () => {
    renderPage(kp, "/bug-reports?projeto=camera");
    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenCalledWith("camera", 1, DEFAULT_TABLE_PAGE_SIZE, {}));

    vi.mocked(bugReportsApi.listar).mockClear();
    renderPage(kp, "/bug-reports?projeto=antigo");
    await waitFor(() => expect(bugReportsApi.listar).toHaveBeenCalledWith("clock", 1, DEFAULT_TABLE_PAGE_SIZE, {}));
  });

  it("o KP escolhe o Dev Fix, até o próprio dono, sem os membros inativos (CA-11 e CA-12)", async () => {
    const user = userEvent.setup();
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Change Dev Fix Clock_000002/ }));
    expect(screen.queryByRole("option", { name: "rafa.l" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "bia.s" }));

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("caso-2", { dev_fix_id: "bia" }));
    expect(toast.success).toHaveBeenCalledWith("Dev Fix changed.");
    expect(timesApi.membros).toHaveBeenCalledWith("time-1");
  });

  it("No Dev Fix remove o Dev Fix com null", async () => {
    const user = userEvent.setup();
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([caso({ dev_fix_id: "ana", dev_fix_identificador: "ana.s" })]));
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as never);
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Change Dev Fix Clock_000002/ }));
    await user.click(await screen.findByRole("option", { name: "No Dev Fix" }));

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("caso-2", { dev_fix_id: null }));
  });

  it("falha: a recusa da API aparece num toast (CA-13)", async () => {
    const user = userEvent.setup();
    vi.mocked(casosTesteApi.atualizar).mockRejectedValue(new Error("Responsável e backup devem ser usuários ativos do time."));
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Change Dev Fix Clock_000002/ }));
    await user.click(await screen.findByRole("option", { name: "ana.s" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Responsável e backup devem ser usuários ativos do time."));
  });

  it("falha: o dev vê o Dev Fix sem a ação de escolher (CA-14)", async () => {
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([caso({ dev_fix_id: "ana", dev_fix_identificador: "ana.s" })]));
    renderPage({ ...kp, perfil_codigo: "USUARIO_PADRAO", permissoes: ["form_factor.consultar"] });

    const [linha] = await screen.findAllByRole("row", { name: /Clock_000002/ });
    expect(within(linha).getByText("ana.s")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Change Dev Fix/ })).not.toBeInTheDocument();
    expect(timesApi.membros).not.toHaveBeenCalled();
  });

  it("vazio avisa que não há falhas no SDF", async () => {
    vi.mocked(bugReportsApi.listar).mockResolvedValue(pagina([]));
    renderPage();

    expect(await screen.findByText("No SDF failures")).toBeInTheDocument();
  });

  it("falha: erro da API aparece com role alert", async () => {
    vi.mocked(bugReportsApi.listar).mockRejectedValue(new Error("boom"));
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the failures. Try again.");
  });
});
