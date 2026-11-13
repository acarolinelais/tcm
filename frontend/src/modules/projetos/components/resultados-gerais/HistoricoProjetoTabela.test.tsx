import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";

import type { CasoHistorico, HistoricoProjeto } from "../../model/projeto";
import { formatarDia } from "./formatar-dia";
import { HistoricoProjetoTabela } from "./HistoricoProjetoTabela";

vi.mock("@/shared/lib/exportar-planilha");

const DATAS = ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06"];
const MODELOS = [{ id: "s26", nome: "S26 Ultra" }, { id: "s25", nome: "S25 Ultra" }, { id: "s24", nome: "S24 Ultra" }, { id: "s23", nome: "S23 Ultra" }];

function caso(tcId: string, resultados: CasoHistorico["resultados"] = {}, ultimo_sdf_por_modelo: CasoHistorico["ultimo_sdf_por_modelo"] = {}): CasoHistorico {
  return { caso_teste_id: `id-${tcId}`, tc_id: tcId, responsavel_id: "u1", responsavel_identificador: "caroline.silva", backup_id: null, rodada_pendente_id: null, ultimo_sdf_por_modelo, resultados };
}

const dados: HistoricoProjeto = {
  modelos: MODELOS,
  datas: DATAS,
  page: 1,
  page_size: DEFAULT_TABLE_PAGE_SIZE,
  total_count: 45,
  items: [
    caso(
      "Clock_001",
      { "2026-10-10": { s26: { execucao_id: "e1", resultado: "PASS", sdf_id: "SDF-26", origem: "SDF" }, s24: { execucao_id: "e2", resultado: "FAIL", sdf_id: "SDF-24", origem: "SDF" } } },
      { s26: "SDF-26", s25: "SDF-25", s24: "SDF-24" },
    ),
    caso("Clock_002"),
  ],
};

function renderizar(props: Partial<Parameters<typeof HistoricoProjetoTabela>[0]> = {}) {
  const handlers = { onAbrirResultado: vi.fn(), onAbrirResumo: vi.fn(), onAlternar: vi.fn(), onFiltroChange: vi.fn(), onTentarDeNovo: vi.fn(), onLimparFiltros: vi.fn(), onPageChange: vi.fn(), onPageSizeChange: vi.fn(), buscarTodos: vi.fn(async () => dados.items) };
  const tela = render(<HistoricoProjetoTabela
    dados={dados} carregando={false} erro={false} filtros={{}} temFiltros={false} page={1} pageSize={DEFAULT_TABLE_PAGE_SIZE}
    expandidos={new Set()}
    {...handlers} {...props}
  />);
  return { ...handlers, ...tela };
}

describe("HistoricoProjetoTabela", () => {
  it("mostra as colunas na ordem do design, com até 5 datas (spec 059, RN-09)", () => {
    renderizar();

    const cabecalhos = screen.getAllByRole("columnheader");
    expect(cabecalhos.map((cabecalho) => cabecalho.textContent)).toEqual(["", "TC ID", "Assignee", "Form Factor", "SDF ID", ...DATAS.map(formatarDia), "Actions"]);
    expect(cabecalhos[0]).toHaveClass("sticky", "left-0");
    expect(cabecalhos[1]).toHaveClass("sticky", "left-20");
    expect(cabecalhos[2]).toHaveClass("sticky", "left-64");
  });

  it("numera as linhas ao lado da seta, seguindo a página, e o nome da linha é só o TC ID", () => {
    renderizar({ page: 2 });

    const linha = screen.getByRole("row", { name: "Clock_001" });
    expect(within(linha).getByText(String(DEFAULT_TABLE_PAGE_SIZE + 1))).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: "Clock_002" })).getByText(String(DEFAULT_TABLE_PAGE_SIZE + 2))).toBeInTheDocument();
    expect(within(linha).getByRole("rowheader")).toHaveTextContent(/^Clock_001$/);
  });

  it("recolhida, a linha mostra só o primeiro device com o SDF da última execução dele (CA-14)", () => {
    renderizar();

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    expect(within(linha).getByText("caroline.silva")).toBeInTheDocument();
    expect(within(linha).getByText("S26 Ultra")).toBeInTheDocument();
    expect(within(linha).queryByText("S25 Ultra")).not.toBeInTheDocument();
    expect(within(linha).getByText("SDF-26")).toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: `PASS on S26 Ultra, ${formatarDia("2026-10-10")}` })).toBeInTheDocument();
    expect(within(linha).queryByText("FAIL")).not.toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: "Show all devices of Clock_001" })).toHaveAttribute("aria-expanded", "false");
  });

  it("com o filtro de Form Factor, a linha mostra só o device escolhido, sem a seta de abrir", () => {
    renderizar({ filtros: { modeloDispositivoId: "s24" }, temFiltros: true });

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    expect(within(linha).getByText("S24 Ultra")).toBeInTheDocument();
    expect(within(linha).queryByText("S26 Ultra")).not.toBeInTheDocument();
    expect(within(linha).getByText("SDF-24")).toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: `FAIL on S24 Ultra, ${formatarDia("2026-10-10")}` })).toBeInTheDocument();
    expect(within(linha).queryByRole("button", { name: "Show all devices of Clock_001" })).not.toBeInTheDocument();
  });

  it("aberta, a linha mostra os quatro devices, cada um com o seu SDF ID e os seus resultados (CA-14)", () => {
    renderizar({ expandidos: new Set(["id-Clock_001"]) });

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    for (const modelo of MODELOS) expect(within(linha).getByText(modelo.nome)).toBeInTheDocument();
    for (const sdf of ["SDF-26", "SDF-25", "SDF-24"]) expect(within(linha).getByText(sdf)).toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: `FAIL on S24 Ultra, ${formatarDia("2026-10-10")}` })).toBeInTheDocument();
    expect(within(linha).getByRole("img", { name: `No run on S23 Ultra, ${formatarDia("2026-10-10")}` })).toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: "Show all devices of Clock_001" })).toHaveAttribute("aria-expanded", "true");
    // A outra linha não muda.
    expect(within(screen.getByRole("row", { name: /Clock_002/ })).queryByText("S25 Ultra")).not.toBeInTheDocument();
  });

  it("a seta abre e fecha só a linha dela, pelo teclado (CA-16)", async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    const seta = within(screen.getByRole("row", { name: /Clock_001/ })).getByRole("button", { name: "Show all devices of Clock_001" });
    // Como na tabela de verdade: Tab entra na grade (na linha), a seta vai à célula do TC ID e o Tab, ao botão.
    const tabela = screen.getByRole("grid");
    for (let i = 0; i < 30 && !tabela.contains(document.activeElement); i++) await user.keyboard("{Tab}");
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Tab}");
    expect(seta).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(handlers.onAlternar).toHaveBeenCalledTimes(2);
    expect(handlers.onAlternar).toHaveBeenCalledWith("id-Clock_001");
  });

  it("sem outro device no projeto, a linha não tem seta", () => {
    renderizar({ dados: { ...dados, modelos: MODELOS.slice(0, 1) } });

    expect(screen.queryByRole("button", { name: /^Show all devices/ })).not.toBeInTheDocument();
  });

  it("os filtros de Assignee e SDF ID avisam o campo certo (CA-17)", async () => {
    const user = userEvent.setup();
    const handlers = renderizar();

    await user.click(screen.getByRole("button", { name: "Filter by SDF ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "SDF ID" }), "SDF-24{Enter}");
    await waitFor(() => expect(handlers.onFiltroChange).toHaveBeenCalledWith("sdfId", "SDF-24"));
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await user.type(await screen.findByRole("searchbox", { name: "Assignee" }), "carol{Enter}");
    await waitFor(() => expect(handlers.onFiltroChange).toHaveBeenCalledWith("responsavel", "carol"));
  });

  it("o histórico é um por caso e abre também com a linha aberta (CA-18)", async () => {
    const user = userEvent.setup();
    const handlers = renderizar({ expandidos: new Set(["id-Clock_001"]) });

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    expect(within(linha).getAllByRole("button", { name: "View execution history Clock_001" })).toHaveLength(1);
    await user.click(within(linha).getByRole("button", { name: "View execution history Clock_001" }));

    expect(handlers.onAbrirResumo).toHaveBeenCalledWith(dados.items[0]);
  });

  it("registra o resultado pela linha quando a tela permite (spec 068, CA-07)", async () => {
    const user = userEvent.setup();
    const onRegistrar = vi.fn();
    renderizar({ podeRegistrar: (caso) => caso.tc_id === "Clock_001", onRegistrar });

    await user.click(screen.getByRole("button", { name: "Record result Clock_001" }));

    expect(onRegistrar).toHaveBeenCalledWith(dados.items[0]);
  });

  it("falha: sem permissão para a linha, não há registro (CA-08)", () => {
    renderizar({ podeRegistrar: (caso) => caso.tc_id === "Clock_001", onRegistrar: vi.fn() });
    expect(screen.queryByRole("button", { name: "Record result Clock_002" })).not.toBeInTheDocument();
  });

  it("clicar no resultado abre o detalhe do device e da data", async () => {
    const user = userEvent.setup();
    const handlers = renderizar({ expandidos: new Set(["id-Clock_001"]) });

    await user.click(screen.getByRole("button", { name: `FAIL on S24 Ultra, ${formatarDia("2026-10-10")}` }));

    expect(handlers.onAbrirResultado).toHaveBeenCalledWith({ tcId: "Clock_001", device: "S24 Ultra", dia: "2026-10-10", resultado: dados.items[0].resultados["2026-10-10"].s24 });
  });

  it("pagina com o total de casos e avisa a troca de página (spec 033)", async () => {
    const handlers = renderizar();

    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(handlers.onPageChange).toHaveBeenCalledWith(2);
  });

  it("mostra a dica SDF Result ao focar o título da data pelo teclado", async () => {
    renderizar();

    const titulo = screen.getByRole("button", { name: formatarDia(DATAS[0]) });
    await userEvent.tab(); // modalidade de teclado, como quem navega com Tab
    act(() => titulo.focus());

    expect(await screen.findByRole("tooltip")).toHaveTextContent("SDF Result");
  });

  it("falha: mostra o erro com tentar de novo", async () => {
    const handlers = renderizar({ erro: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load results.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(handlers.onTentarDeNovo).toHaveBeenCalled();
  });

  it("falha: sem correspondência, mostra nenhum resultado com limpar", async () => {
    const handlers = renderizar({ dados: { ...dados, items: [], total_count: 0 }, temFiltros: true });

    expect(screen.getByText("No results found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(handlers.onLimparFiltros).toHaveBeenCalled();
  });

  it("exporta uma linha por caso com o primeiro device, o que a linha recolhida mostra", async () => {
    const outro = caso("Clock_050", { "2026-10-09": { s25: { execucao_id: "e9", resultado: "PASS", sdf_id: null, origem: "MANUAL" } } });
    const buscarTodos = vi.fn(async () => [...dados.items, outro]);
    const user = userEvent.setup();
    renderizar({ buscarTodos });

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^resultados-gerais_/)));
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(itens).toEqual([...dados.items, outro]);
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["TC ID", "Assignee", "Form Factor", "SDF ID", ...DATAS.map(formatarDia)]);
    expect(colunas.slice(0, 5).map((coluna) => coluna.valor(dados.items[0]))).toEqual(["Clock_001", "caroline.silva", "S26 Ultra", "SDF-26", "PASS"]);
    expect(colunas.slice(0, 6).map((coluna) => coluna.valor(outro))).toEqual(["Clock_050", "caroline.silva", "S26 Ultra", "—", "—", "—"]);
  });
});
