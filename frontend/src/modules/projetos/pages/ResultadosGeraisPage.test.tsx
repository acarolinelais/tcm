import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { useHistoricoProjeto, useProjetosSeletor, useResumoExecucoes } from "../hooks/useProjetos";
import type { FiltrosHistoricoProjeto, HistoricoProjeto, ResumoExecucoes } from "../model/projeto";
import { formatarDia } from "../components/resultados-gerais/formatar-dia";
import { ResultadosGeraisPage } from "./ResultadosGeraisPage";

vi.mock("../hooks/useProjetos", () => ({
  useHistoricoProjeto: vi.fn(),
  useResumoExecucoes: vi.fn(),
  useProjetosSeletor: vi.fn(),
}));

const perfil = {
  id: "manager-1", nome: "Gerente", email: "manager@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["form_factor.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
} as PerfilAtual;

const DIA = "2026-10-10";
const projetos = [{ id: "clock", nome: "Clock 9.5" }, { id: "gallery", nome: "Gallery 9.5" }];
const resultado = (execucao_id: string, valor: string, origem: "SDF" | "MANUAL" = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });

const historico: HistoricoProjeto = {
  modelos: [{ id: "s26", nome: "SM-S26" }, { id: "s27", nome: "SM-S27" }],
  datas: [DIA],
  modelo_destacado_id: null,
  page: 1,
  page_size: DEFAULT_TABLE_PAGE_SIZE,
  total_count: 45,
  items: [
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

/** Mostra o endereço atual, para conferir o `?projeto=` gravado pela tela. */
function Endereco() {
  return <p data-testid="endereco">{useLocation().search}</p>;
}

function renderPage(currentProfile: PerfilAtual = perfil, url = "/") {
  function Contexto() { return <Outlet context={currentProfile} />; }
  // MemoryRouter declarativo: o createMemoryRouter navega com um Request que o jsdom rejeita.
  return render(<MemoryRouter initialEntries={[url]}><Routes><Route path="/" element={<Contexto />}><Route index element={<><ResultadosGeraisPage /><Endereco /></>} /></Route></Routes></MemoryRouter>);
}

/** Troca de projeto pelo seletor do título (spec 053). */
async function trocarProjeto(user: ReturnType<typeof userEvent.setup>, atual: string, destino: string) {
  await user.click(screen.getByRole("button", { name: atual }));
  await user.click(await screen.findByRole("menuitemradio", { name: destino }));
}

/** Filtros enviados ao hook: os da tela mais a página (spec 033). */
const comPagina = (filtros: FiltrosHistoricoProjeto = {}, page = 1, pageSize = DEFAULT_TABLE_PAGE_SIZE): FiltrosHistoricoProjeto => ({ ...filtros, page, pageSize });

const linha = (tcId: string) => screen.getByRole("row", { name: new RegExp(tcId) });

describe("ResultadosGeraisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: projetos, page: 1, page_size: 100, total_count: 2 }] }, isError: false, isLoading: false } as never);
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: historico, isLoading: false, isError: false, refetch: vi.fn() } as never);
    vi.mocked(useResumoExecucoes).mockImplementation((casoId) => ({ data: casoId ? resumo : undefined, isLoading: false, isError: false, refetch: vi.fn() }) as never);
  });

  it("abre o primeiro projeto com o nome no título e troca pelo seletor, gravando o projeto no endereço (spec 053, CA-02)", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Clock 9.5");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil);

    await trocarProjeto(user, "Clock 9.5", "Gallery 9.5");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);
    expect(screen.getByTestId("endereco")).toHaveTextContent("?projeto=gallery");
  });

  it("com 40 projetos, mostra só o primeiro no título, sem abas, e a busca acha os outros (spec 053, CA-01)", async () => {
    const user = userEvent.setup();
    const muitos = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, nome: `Projeto ${String(i).padStart(2, "0")}` }));
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: muitos, page: 1, page_size: 100, total_count: 40 }] }, isError: false, isLoading: false } as never);
    renderPage();

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Projeto 39")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Projeto 00" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search project" }), "39");
    await user.click(screen.getByRole("menuitemradio", { name: "Projeto 39" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("p39", comPagina(), perfil);
  });

  it("o projeto do endereço abre direto (spec 053, CA-04)", () => {
    renderPage(perfil, "/?projeto=gallery");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Gallery 9.5");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);
  });

  it("um projeto do endereço fora da lista abre o primeiro, sem consultar o id do link (spec 053, CA-05)", () => {
    renderPage(perfil, "/?projeto=outra-unidade");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Clock 9.5");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil);
    expect(vi.mocked(useHistoricoProjeto).mock.calls.map(([id]) => id)).not.toContain("outra-unidade");
  });

  it("com páginas de projetos ainda por carregar, o link espera em vez de abrir o primeiro (spec 053, CA-04)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: projetos, page: 1, page_size: 100, total_count: 150 }] }, isError: false, isLoading: false, hasNextPage: true, isFetchingNextPage: true, fetchNextPage: vi.fn() } as never);
    renderPage(perfil, "/?projeto=projeto-da-pagina-2");
    expect(vi.mocked(useHistoricoProjeto).mock.calls.map(([id]) => id)).not.toContain("clock");
  });

  it("com um projeto só, o título não abre seletor (spec 053, CA-07)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [projetos[0]], page: 1, page_size: 100, total_count: 1 }] }, isError: false, isLoading: false } as never);
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Clock 9.5");
    expect(screen.queryByRole("button", { name: "Clock 9.5" })).not.toBeInTheDocument();
  });

  it("abre cada linha no modelo padrão e guarda a escolha de cada linha, esquecida ao trocar de projeto (CA-05, CA-06)", async () => {
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
    for (const [projetoId, filtros] of vi.mocked(useHistoricoProjeto).mock.calls.slice(chamadas)) expect([projetoId, filtros]).toEqual(["clock", comPagina()]);

    await trocarProjeto(user, "Clock 9.5", "Gallery 9.5");
    await trocarProjeto(user, "Gallery 9.5", "Clock 9.5");
    expect(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S27");
  });

  it("a lupa envia a busca e as linhas usam o modelo destacado; o filtro de cabeçalho envia TC ID e modelo (CA-10, CA-10a)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" }));
    await user.type(screen.getByRole("searchbox", { name: "Search by tester ID, SDF ID or device" }), "s26{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ busca: "s26" }), perfil));

    const casosNoS26 = historico.items.map((caso) => ({ ...caso, modelo_padrao_id: "s26" }));
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, modelo_destacado_id: "s26", items: casosNoS26 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "001{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ busca: "s26", tcId: "001" }), perfil));
    expect(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S26");

    await user.click(screen.getByRole("button", { name: "Filter by Form Factor" }));
    await user.click(await screen.findByRole("option", { name: "SM-S27" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ busca: "s26", tcId: "001", modeloDispositivoId: "s27" }), perfil));
  });

  it("pagina os casos; filtro, tamanho e projeto voltam à página 1 e a escolha da linha sobrevive à troca de página (spec 033)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({}, 2), perfil);

    // CA-06: a escolha é por caso, então volta igual ao ir e voltar de página.
    await user.click(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" }));
    await user.click(await screen.findByRole("option", { name: "SM-S26" }));
    await user.click(screen.getByRole("button", { name: "Page 1" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil);
    expect(within(linha("Clock_001")).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S26");

    // CA-04: filtro volta para a página 1.
    await user.click(screen.getByRole("button", { name: "Page 3" }));
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "001{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ tcId: "001" }), perfil));

    // CA-05 (e spec 053, CA-06): o outro projeto abre sem filtros, na página 1.
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await trocarProjeto(user, "Clock 9.5", "Gallery 9.5");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);

    // CA-04: trocar o tamanho também.
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await user.click(screen.getByRole("button", { name: /Items per page/ }));
    await user.click(await screen.findByRole("option", { name: "50" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina({}, 1, 50), perfil));
  });

  it("se o total encolhe, volta para a última página que existe (spec 033)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, page: 3, items: [], total_count: 30 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    await user.click(screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" })); // só para renderizar de novo

    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({}, 2), perfil));
  });

  it("sem correspondência mostra nenhum resultado e limpar volta a tudo (CA-11, RN-12)", async () => {
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, items: [], total_count: 0 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" }));
    await user.type(screen.getByRole("searchbox", { name: "Search by tester ID, SDF ID or device" }), "nada{Enter}");
    expect(await screen.findByText("No results found")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);

    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil));
  });

  it("o calendário envia a semana escolhida como período e limpar volta às datas recentes (CA-12)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^Day or Week: / }));
    await user.click((await screen.findAllByRole("button", { name: /^Week \d+, \d{4}$/ }))[0]);
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ periodo: expect.stringMatching(/^\d{4}-W\d{2}$/) }), perfil));

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil));
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

  it("o TC ID é só texto e não abre o painel do caso (spec 050, CA-01)", async () => {
    const user = userEvent.setup();
    renderPage();

    const tcId = within(linha("Clock_001")).getByText("Clock_001");
    expect(tcId.closest("button, a")).toBeNull();
    await user.click(tcId);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sem projeto acessível mostra o estado vazio; perfil sem permissão continua negado (CA-02)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [], page: 1, page_size: 100, total_count: 0 }] }, isError: false, isLoading: false } as never);
    const { unmount } = renderPage();
    expect(screen.getByText("No projects to show")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("General Results");
    unmount();

    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("", comPagina(), expect.anything());
  });

  it("a lupa é o botão redondo do protótipo e abre a busca como antes (spec 050)", async () => {
    const user = userEvent.setup();
    renderPage();
    const lupa = screen.getByRole("button", { name: "Search by tester ID, SDF ID or device" });

    expect(lupa).toHaveClass("size-9", "rounded-full", "border-edge", "bg-surface", "data-[pressed]:scale-[0.97]");
    await user.click(lupa);
    expect(screen.getByRole("searchbox", { name: "Search by tester ID, SDF ID or device" })).toHaveFocus();
  });
});

