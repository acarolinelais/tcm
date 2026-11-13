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
  useImportarRelatorioSdf: () => ({ mutate: vi.fn(), isPending: false }),
  useUltimaImportacaoSdf: () => ({ data: null }),
  useDesfazerImportacaoSdf: () => ({ mutate: vi.fn(), isPending: false }),
}));

const perfil = {
  id: "manager-1", nome: "Gerente", email: "manager@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["form_factor.consultar", "form_factor.registrar", "form_factor.importar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
} as PerfilAtual;
const dev = { ...perfil, id: "dev-1", perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", permissoes: ["form_factor.consultar", "form_factor.registrar"] } as PerfilAtual;

const DIA = "2026-10-10";
const projetos = [{ id: "clock", nome: "Clock 2.0", app: "Clock" }, { id: "gallery", nome: "Gallery 9.5", app: "Gallery" }];
const resultado = (execucao_id: string, valor: string, origem: "SDF" | "MANUAL" = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });

const historico: HistoricoProjeto = {
  modelos: [{ id: "s26", nome: "SM-S26" }, { id: "s27", nome: "SM-S27" }],
  datas: [DIA],
  page: 1,
  page_size: DEFAULT_TABLE_PAGE_SIZE,
  total_count: 45,
  items: [
    { caso_teste_id: "c1", tc_id: "Clock_001", responsavel_id: "u1", responsavel_identificador: "ANA-001", backup_id: null, rodada_pendente_id: null, ultimo_sdf_por_modelo: { s26: "SDF-e1", s27: "SDF-e2" }, resultados: { [DIA]: { s26: resultado("e1", "PASS"), s27: resultado("e2", "FAIL") } } },
    { caso_teste_id: "c2", tc_id: "Clock_002", responsavel_id: "u1", responsavel_identificador: null, backup_id: null, rodada_pendente_id: null, ultimo_sdf_por_modelo: { s26: null, s27: "SDF-e4" }, resultados: { [DIA]: { s26: resultado("e3", "PASS", "MANUAL"), s27: resultado("e4", "PASS") } } },
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

  it("mostra o título, uma aba por projeto com só o nome do app, e troca pela aba gravando o endereço (spec 059, CA-12)", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("General Results");
    expect(screen.getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Clock", "Gallery"]);
    expect(screen.getByRole("tab", { name: "Clock" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Next project" })).not.toBeInTheDocument();
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil);

    await user.click(screen.getByRole("tab", { name: "Gallery" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);
    expect(screen.getByTestId("endereco")).toHaveTextContent("?projeto=gallery");
  });

  it("o dev vê os projetos do time dele, sem os botões de gerência (CA-01, CA-06)", () => {
    renderPage(dev);

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    expect(useProjetosSeletor).toHaveBeenCalledWith(dev, true);
    expect(screen.queryByRole("button", { name: "Import SDF report" })).not.toBeInTheDocument();
  });

  it("o gerente com as permissões vê Import SDF Report no topo da tabela (CA-05)", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Import SDF report" })).toBeInTheDocument();
  });

  it("esconde a aba do projeto concluído até ligar o filtro; pelo link, ele abre mesmo assim", async () => {
    const comConcluido = [...projetos, { id: "notes", nome: "Notes 9.5", app: "Notes", status: "Completed" }];
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: comConcluido, page: 1, page_size: 100, total_count: 3 }] }, isError: false, isLoading: false } as never);
    const user = userEvent.setup();
    const { unmount } = renderPage();

    expect(screen.getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Clock", "Gallery"]);
    await user.click(screen.getByRole("button", { name: "Closed projects" }));
    expect(screen.getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Clock", "Gallery", "Notes"]);

    unmount();
    renderPage(perfil, "/?projeto=notes");
    expect(screen.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("notes", comPagina(), perfil);
  });

  it("com mais de três projetos mostra três abas, e as setas abrem o projeto vizinho, deslizando a janela na borda", async () => {
    const cinco = ["Clock", "Gallery", "Notes", "Weather", "Camera"].map((app) => ({ id: app.toLowerCase(), nome: `${app} 9.5`, app }));
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: cinco, page: 1, page_size: 100, total_count: 5 }] }, isError: false, isLoading: false } as never);
    const user = userEvent.setup();
    renderPage();
    const abas = () => screen.getAllByRole("tab").map((aba) => aba.textContent);
    const aberta = () => screen.getByRole("tab", { selected: true }).textContent;

    expect(abas()).toEqual(["Clock", "Gallery", "Notes"]);
    expect(screen.getByRole("button", { name: "Previous project" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "Clock" }).closest("[data-abas-direcao]")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Next project" }));
    expect(aberta()).toBe("Gallery");
    expect(abas()).toEqual(["Clock", "Gallery", "Notes"]);
    expect(screen.getByTestId("endereco")).toHaveTextContent("?projeto=gallery");

    await user.click(screen.getByRole("button", { name: "Next project" }));
    await user.click(screen.getByRole("button", { name: "Next project" }));
    // Na borda, a janela anda uma aba, e a fila entra pela direita.
    expect(aberta()).toBe("Weather");
    expect(abas()).toEqual(["Gallery", "Notes", "Weather"]);
    expect(screen.getByRole("tab", { name: "Weather" }).closest("[data-abas-direcao]")).toHaveAttribute("data-abas-direcao", "proximo");

    await user.click(screen.getByRole("button", { name: "Next project" }));
    expect(aberta()).toBe("Camera");
    expect(abas()).toEqual(["Notes", "Weather", "Camera"]);
    expect(screen.getByRole("button", { name: "Next project" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Previous project" }));
    expect(aberta()).toBe("Weather");
    expect(abas()).toEqual(["Notes", "Weather", "Camera"]);
  });

  it("o projeto do endereço fora das três primeiras abre com a janela mostrando ele", () => {
    const cinco = ["Clock", "Gallery", "Notes", "Weather", "Camera"].map((app) => ({ id: app.toLowerCase(), nome: `${app} 9.5`, app }));
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: cinco, page: 1, page_size: 100, total_count: 5 }] }, isError: false, isLoading: false } as never);
    renderPage(perfil, "/?projeto=camera");

    expect(screen.getAllByRole("tab").map((aba) => aba.textContent)).toEqual(["Notes", "Weather", "Camera"]);
    expect(screen.getByRole("tab", { name: "Camera" })).toHaveAttribute("aria-selected", "true");
  });

  it("o projeto do endereço abre direto (spec 053, CA-04)", () => {
    renderPage(perfil, "/?projeto=gallery");
    expect(screen.getByRole("tab", { name: "Gallery" })).toHaveAttribute("aria-selected", "true");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);
  });

  it("falha: um projeto do endereço fora do escopo abre o primeiro, sem consultar o id do link (CA-02)", () => {
    renderPage(dev, "/?projeto=outro-time");
    expect(screen.getByRole("tab", { name: "Clock" })).toHaveAttribute("aria-selected", "true");
    expect(vi.mocked(useHistoricoProjeto).mock.calls.map(([id]) => id)).not.toContain("outro-time");
  });

  it("com páginas de projetos ainda por carregar, o link espera em vez de abrir o primeiro (spec 053, CA-04)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: projetos, page: 1, page_size: 100, total_count: 150 }] }, isError: false, isLoading: false, hasNextPage: true, isFetchingNextPage: true, fetchNextPage: vi.fn() } as never);
    renderPage(perfil, "/?projeto=projeto-da-pagina-2");
    expect(vi.mocked(useHistoricoProjeto).mock.calls.map(([id]) => id)).not.toContain("clock");
  });

  it("a seta abre a linha com todos os devices, e trocar de página recolhe (CA-14, RN-12)", async () => {
    const user = userEvent.setup();
    renderPage();

    const seta = within(linha("Clock_001")).getByRole("button", { name: "Show all devices of Clock_001" });
    expect(within(linha("Clock_001")).queryByText("SM-S27")).not.toBeInTheDocument();
    await user.click(seta);
    expect(within(linha("Clock_001")).getByText("SM-S27")).toBeInTheDocument();
    expect(within(linha("Clock_001")).getByRole("button", { name: `FAIL on SM-S27, ${formatarDia(DIA)}` })).toBeInTheDocument();
    expect(within(linha("Clock_002")).queryByText("SM-S27")).not.toBeInTheDocument();

    // CA-16: a mesma seta recolhe, de volta ao primeiro device, e a outra linha continua como estava.
    await user.click(within(linha("Clock_002")).getByRole("button", { name: "Show all devices of Clock_002" }));
    await user.click(within(linha("Clock_001")).getByRole("button", { name: "Show all devices of Clock_001" }));
    expect(within(linha("Clock_001")).queryByText("SM-S27")).not.toBeInTheDocument();
    expect(within(linha("Clock_001")).getByText("SM-S26")).toBeInTheDocument();
    expect(within(linha("Clock_002")).getByText("SM-S27")).toBeInTheDocument();
    await user.click(within(linha("Clock_001")).getByRole("button", { name: "Show all devices of Clock_001" }));

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({}, 2), perfil);
    expect(within(linha("Clock_001")).queryByText("SM-S27")).not.toBeInTheDocument();
  });

  it("os filtros de cabeçalho enviam TC ID, Assignee, SDF ID e modelo (CA-17)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Filter by SDF ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "SDF ID" }), "SDF-e4{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ sdfId: "SDF-e4" }), perfil));
    await user.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await user.type(await screen.findByRole("searchbox", { name: "Assignee" }), "ana{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ sdfId: "SDF-e4", responsavel: "ana" }), perfil));
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "001{Enter}");
    await user.click(screen.getByRole("button", { name: "Filter by Form Factor" }));
    await user.click(await screen.findByRole("option", { name: "SM-S27" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ sdfId: "SDF-e4", responsavel: "ana", tcId: "001", modeloDispositivoId: "s27" }), perfil));
    // A busca livre saiu (spec 059, RN-13).
    expect(screen.queryByRole("button", { name: "Search by tester ID, SDF ID or device" })).not.toBeInTheDocument();
  });

  it("pagina os casos; filtro, tamanho e projeto voltam à página 1 (spec 033)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({}, 3), perfil);
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "001{Enter}");
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ tcId: "001" }), perfil));

    // O outro projeto abre sem filtros, na página 1 (spec 053, CA-06).
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await user.click(screen.getByRole("tab", { name: "Gallery" }));
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina(), perfil);

    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await user.click(screen.getByRole("button", { name: /Items per page/ }));
    await user.click(await screen.findByRole("option", { name: "50" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("gallery", comPagina({}, 1, 50), perfil));
  });

  it("se o total encolhe, volta para a última página que existe (spec 033)", async () => {
    // A página 3 já não existe quando chega: casos foram removidos e o total caiu para 30.
    vi.mocked(useHistoricoProjeto).mockImplementation((_, filtros) => ({ data: filtros.page === 3 ? { ...historico, page: 3, items: [], total_count: 30 } : historico, isLoading: false, isError: false, refetch: vi.fn() }) as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Page 3" }));

    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({}, 2), perfil));
  });

  it("falha: sem correspondência mostra nenhum resultado e limpar volta a tudo", async () => {
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, items: [], total_count: 0 }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Filter by SDF ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "SDF ID" }), "nada{Enter}");
    expect(await screen.findByText("No results found")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Clear filters" }).at(-1)!);

    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil));
  });

  it("o calendário envia a semana escolhida como período e limpar volta às datas recentes", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /^Day or Week: / }));
    await user.click((await screen.findAllByRole("button", { name: /^Week \d+, \d{4}$/ }))[0]);
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina({ periodo: expect.stringMatching(/^\d{4}-W\d{2}$/) }), perfil));

    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(useHistoricoProjeto).toHaveBeenLastCalledWith("clock", comPagina(), perfil));
  });

  it("o resultado abre a janela com SDF ID, origem e só Fechar; manual sem SDF ID mostra o marcador vazio", async () => {
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

  it("a janela do resultado mostra a descrição do relatório SDF; sem descrição, a linha some (spec 060, CA-02)", async () => {
    const comDescricao = { ...historico.items[0], resultados: { [DIA]: { ...historico.items[0].resultados[DIA], s26: { ...resultado("e1", "PASS"), descricao: "# PASS: Test case was executed successfully" } } } };
    vi.mocked(useHistoricoProjeto).mockReturnValue({ data: { ...historico, items: [comDescricao, historico.items[1]] }, isLoading: false, isError: false, refetch: vi.fn() } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(within(linha("Clock_001")).getByRole("button", { name: `PASS on SM-S26, ${formatarDia(DIA)}` }));
    const janela = await screen.findByRole("dialog");
    expect(within(janela).getByText("Description")).toBeInTheDocument();
    expect(within(janela).getByText("# PASS: Test case was executed successfully")).toBeInTheDocument();
    await user.click(within(janela).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(within(linha("Clock_002")).getByRole("button", { name: `PASS on SM-S26, ${formatarDia(DIA)}` }));
    expect(within(await screen.findByRole("dialog")).queryByText("Description")).not.toBeInTheDocument();
  });

  it("o histórico da linha mostra o tester e a grade datas × devices, com as duas execuções do dia (CA-18)", async () => {
    const user = userEvent.setup();
    renderPage(dev);

    await user.click(within(linha("Clock_001")).getByRole("button", { name: "View execution history Clock_001" }));
    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByText("ANA-001")).toBeInTheDocument();
    expect(within(painel).getAllByRole("columnheader").map((cabecalho) => cabecalho.textContent)).toEqual(["Date", "SM-S26", "SM-S27"]);
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

  it("falha: sem projeto acessível mostra o estado vazio, sem abas nem botões; sem permissão continua negado (CA-20)", () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [], page: 1, page_size: 100, total_count: 0 }] }, isError: false, isLoading: false } as never);
    const { unmount } = renderPage();
    expect(screen.getByText("No projects to show")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("General Results");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Import SDF report" })).not.toBeInTheDocument();
    unmount();

    renderPage({ ...dev, permissoes: [] });
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission");
    expect(useHistoricoProjeto).toHaveBeenLastCalledWith("", comPagina(), expect.anything());
  });
});
