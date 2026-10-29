import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useCasoTeste, useHistoricoProjeto, useProjetosSeletor, useResumoExecucoes } from "../hooks/useProjetos";
import type { HistoricoProjeto, ResumoExecucoes } from "../model/projeto";
import { formatarDia } from "../components/resultados-gerais/formatar-dia";
import { ResultadosGeraisPage } from "./ResultadosGeraisPage";

vi.mock("../hooks/useProjetos", () => ({
  useHistoricoProjeto: vi.fn(),
  useResumoExecucoes: vi.fn(),
  useProjetosSeletor: vi.fn(),
  // Painel de detalhes (specs 028 e 030).
  ehNaoEncontrado: () => false,
  useCasoTeste: vi.fn(),
  usePullRequestsCasoTeste: () => ({ data: { itens: [], pode_remover: true }, isError: false }),
  useAdicionarPullRequest: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRemoverPullRequest: () => ({ isPending: false, mutate: vi.fn() }),
}));

const perfil = {
  id: "manager-1", nome: "Gerente", email: "manager@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["form_factor.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
} as PerfilAtual;

const DIA = "2026-10-10";
const projetos = [{ id: "clock", nome: "Clock 9.5" }, { id: "gallery", nome: "Gallery 9.5" }];
const resultado = (execucao_id: string, valor: string, origem: "SDF" | "MANUAL" = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });

const historico: HistoricoProjeto = {
  modelos: [{ id: "s26", nome: "SM-S26" }, { id: "s27", nome: "SM-S27" }],
  datas: [DIA],
  modelo_destacado_id: null,
  casos: [
    { caso_teste_id: "c1", tc_id: "Clock_001", responsavel_id: "u1", responsavel_identificador: "ANA-001", modelo_padrao_id: "s27", resultados: { [DIA]: { s26: resultado("e1", "PASS"), s27: resultado("e2", "FAIL") } } },
    { caso_teste_id: "c2", tc_id: "Clock_002", responsavel_id: "u1", responsavel_identificador: null, modelo_padrao_id: "s26", resultados: { [DIA]: { s26: resultado("e3", "PASS", "MANUAL"), s27: resultado("e4", "PASS") } } },
  ],
};

const resumo: ResumoExecucoes = {
  caso_teste_id: "c1", tc_id: "Clock_001", responsavel_identificador: "ANA-001",
  modelos: historico.modelos,
  datas: ["2026-10-09", DIA],
  resultados: { [DIA]: { s26: [{ ...resultado("e0", "FAIL"), data_reportada: `${DIA}T09:00:00Z` }, { ...resultado("e1", "PASS", "MANUAL"), data_reportada: `${DIA}T15:00:00Z` }] } },
};

function renderPage(currentProfile: PerfilAtual = perfil) {
  const router = createMemoryRouter([{
    path: "/",
    element: <><Outlet context={currentProfile} /></>,
    children: [{ index: true, element: <ResultadosGeraisPage /> }],
  }], { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

const linha = (tcId: string) => screen.getByRole("row", { name: new RegExp(tcId) });

describe("ResultadosGeraisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: projetos, page: 1, page_size: 100, total_count: 2 }] }, isError: false, isLoading: false } as never);
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: historico, isLoading: false, isError: false, refetch: vi.fn() } as never);
    vi.mocked(useResumoExecucoes).mockImplementation((casoId) => ({ data: casoId ? resumo : undefined, isLoading: false, isError: false, refetch: vi.fn() }) as never);
    vi.mocked(useCasoTeste).mockImplementation((id) => ({ data: id ? { id, tc_id: "Clock_001", title: `Título ${id}`, precondition: null, procedure: null, expected_result: null } : undefined, isError: false, error: null }) as never);
  });

  it("mostra uma aba com o nome de cada projeto, abre a primeira e consulta o projeto da aba (CA-01)", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("tab", { name: "Clock 9.5" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Gallery 9.5" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", {}, perfil);

    await user.click(screen.getByRole("tab", { name: "Gallery 9.5" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", {}, perfil);
  });

  it("abre cada linha no modelo padrão e guarda a escolha de cada linha, esquecida ao trocar de aba (CA-05, CA-06)", async () => {
    const user = userEvent.setup();
    renderPage();
    const chamadas = vi.mocked(useHistoricoProjeto).mock.calls.length;

    expect(within(linha("Clock_001")).getByRole("button", { name: `FAIL on SM-S27, ${formatarDia(DIA)}` })).toBeInTheDocument();
    await user.click(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" }));
    await user.click(await screen.findByRole("option", { name: "SM-S26" }));
    await user.click(within(linha("Clock_002")).getByRole("button", { name: "Form Factor Clock_002" }));
    await user.click(await screen.findByRole("option", { name: "SM-S27" }));

    expect(within(linha("Clock_001")).getByRole("button", { name: `PASS on SM-S26, ${formatarDia(DIA)}` })).toBeInTheDocument();
    expect(within(linha("Clock_002")).getByRole("button", { name: `PASS on SM-S27, ${formatarDia(DIA)}` })).toBeInTheDocument();
    expect(vi.mocked(useHistoricoProjeto).mock.calls.slice(chamadas).every(([projetoId, filtros]) => projetoId === "clock" && Object.keys(filtros).length === 0)).toBe(true);

    await user.click(screen.getByRole("tab", { name: "Gallery 9.5" }));
    await user.click(screen.getByRole("tab", { name: "Clock 9.5" }));
    expect(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S27");
  });

  it("a lupa envia a busca e as linhas usam o modelo destacado; o filtro de cabeçalho envia TC ID e modelo (CA-10, CA-10a)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" }));
    await user.type(screen.getByRole("searchbox", { name: "Search by tester ID, SDF ID or device" }), "s26{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", { busca: "s26" }, perfil));

    const casosNoS26 = historico.casos.map((caso) => ({ ...caso, modelo_padrao_id: "s26" }));
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, modelo_destacado_id: "s26", casos: casosNoS26 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "001{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", { busca: "s26", tcId: "001" }, perfil));
    expect(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S26");

    await user.click(screen.getByRole("button", { name: "Filter by Form Factor" }));
    await user.click(await screen.findByRole("option", { name: "SM-S27" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", { busca: "s26", tcId: "001", modeloDispositivoId: "s27" }, perfil));
  });

  it("sem correspondência mostra nenhum resultado e limpar volta a tudo (CA-11, RN-12)", async () => {
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, casos: [] }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" }));
    await user.type(screen.getByRole("searchbox", { name: "Search by tester ID, SDF ID or device" }), "nada{Enter}");
    expect(await screen.findByText("No results found")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);

    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", {}, perfil));
  });

  it("o calendário envia a semana escolhida como período e limpar volta às datas recentes (CA-12)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^Day or week: / }));
    await user.click((await screen.findAllByRole("button", { name: /^Week \d+, \d{4}$/ }))[0]);
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", { periodo: expect.stringMatching(/^\d{4}-W\d{2}$/) }, perfil));

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", {}, perfil));
  });

  it("o resultado abre a janela com SDF ID, origem e só Fechar; manual sem SDF ID mostra o marcador vazio (CA-09)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(within(linha("Clock_002")).getByRole("button", { name: `PASS on SM-S26, ${formatarDia(DIA)}` }));
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByRole("heading")).toHaveTextContent(`Clock_002 · SM-S26 · ${formatarDia(DIA)}`);
    expect(within(janela).getByText("Added manually")).toBeInTheDocument();
    expect(within(janela).getByText("—")).toBeInTheDocument();
    expect(within(janela).getAllByRole("button")).toHaveLength(1);
    await user.click(within(janela).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("o Resumo de execuções mostra o tester e a grade devices × datas, com as duas execuções do dia (CA-08, CA-13)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(within(linha("Clock_001")).getByRole("button", { name: "Execution summary Clock_001" }));
    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByText("ANA-001")).toBeInTheDocument();
    expect(within(painel).getAllByRole("columnheader").map((cabecalho) => cabecalho.textContent)).toEqual(["Device", formatarDia("2026-10-09"), formatarDia(DIA)]);
    expect(within(painel).getAllByRole("rowheader").map((cabecalho) => cabecalho.textContent)).toEqual(["SM-S26", "SM-S27"]);
    const rotulo = (valor: string) => `${valor} on SM-S26, ${formatarDia(DIA)}`;
    expect(within(painel).getByRole("button", { name: rotulo("FAIL") })).toBeInTheDocument();
    await user.click(within(painel).getByRole("button", { name: rotulo("PASS") }));

    expect(await screen.findByText("Added manually")).toBeInTheDocument();
  });

  it("o TC ID abre o painel do caso (spec 030)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Clock_001" }));
    expect(within(await screen.findByRole("dialog")).getByText("Título c1")).toBeInTheDocument();
  });

  it("sem projeto acessível mostra o estado vazio; perfil sem permissão continua negado (CA-02)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [], page: 1, page_size: 100, total_count: 0 }] }, isError: false, isLoading: false } as never);
    const { unmount } = renderPage();
    expect(screen.getByText("No projects to show")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    unmount();

    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("", {}, expect.anything());
  });
});
