import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import type { FormFactorMatriz } from "../../model/projeto";
import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";
import { FormFactorTabela } from "./FormFactorTabela";

vi.mock("@/shared/lib/exportar-planilha");

const matriz: FormFactorMatriz = {
  modelos: [{ id: "s25", nome: "SAMSUNG S25" }, { id: "s26", nome: "SAMSUNG S26" }],
  items: [
    { caso_teste_id: "c1", tc_id: "TC-001", responsavel_id: "ana", sdf_id: "SDF-10", data_reportada: "2026-03-23T12:00:00Z", resultados: { s25: "PASS", s26: "Fail" } },
    { caso_teste_id: "c2", tc_id: "TC-002", responsavel_id: "bia", sdf_id: null, data_reportada: null, resultados: {} },
    { caso_teste_id: "c3", tc_id: "TC-003", responsavel_id: "fora", sdf_id: "SDF-11", data_reportada: "2026-03-24T12:00:00Z", resultados: { s25: "Blocked" } },
  ],
  page: 1, page_size: DEFAULT_TABLE_PAGE_SIZE, total_count: 3,
};

function renderTabela(props: Partial<Parameters<typeof FormFactorTabela>[0]> = {}) {
  const handlers = { onAssigneeChange: vi.fn(), onLimparFiltros: vi.fn(), onPageChange: vi.fn(), onPageSizeChange: vi.fn(), onAbrirDetalhes: vi.fn(), buscarTodos: vi.fn(async () => matriz.items) };
  render(<FormFactorTabela
    dados={matriz} carregando={false} erro={false}
    identificadoresMembros={{ ana: "ana.silva", bia: "bia.souza" }}
    opcoesAssignee={[{ value: "ana", label: "ana.silva" }, { value: "bia", label: "bia.souza" }]}
    assignee={[]} temFiltros={false} page={1} pageSize={DEFAULT_TABLE_PAGE_SIZE}
    {...handlers} {...props}
  />);
  return handlers;
}

const linhasDoCorpo = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
// No React Aria a célula da coluna-título é rowheader e as demais, gridcell: leia na ordem das colunas.
const celulas = (linha: HTMLElement) => Array.from(linha.querySelectorAll<HTMLElement>("th, td"));
const fundoDaEtiqueta = (celula: HTMLElement) => celula.querySelector<HTMLElement>(".chip")?.style.getPropertyValue("--chip-bg");

describe("FormFactorTabela", () => {
  it("o TC ID abre o painel do caso (spec 030), sem disparar o registro de resultado", async () => {
    const user = userEvent.setup();
    const onRegistrar = vi.fn();
    const { onAbrirDetalhes } = renderTabela({ podeRegistrar: () => true, onRegistrar });

    await user.click(screen.getByRole("button", { name: "TC-002" }));

    expect(onAbrirDetalhes).toHaveBeenCalledWith({ id: "c2", tc_id: "TC-002" });
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it("mostra uma coluna por modelo, o resultado de cada caso e — onde não há resultado", () => {
    renderTabela();

    const cabecalhos = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(cabecalhos).toEqual(["", "TC ID", "SDF ID", "Assignee", "SAMSUNG S25", "SAMSUNG S26", "Date"]);
    expect(screen.queryByRole("columnheader", { name: "One UI Version" })).not.toBeInTheDocument();

    const [primeira, segunda, terceira] = linhasDoCorpo().map(celulas);
    expect(primeira.map((cell) => cell.textContent)).toEqual(["01", "TC-001", "SDF-10", "ana.silva", "PASS", "Fail", expect.stringMatching(/2026/)]);
    expect(fundoDaEtiqueta(primeira[4])).toBe("var(--etiqueta-ativo-bg)");
    expect(fundoDaEtiqueta(primeira[5])).toBe("var(--etiqueta-fixes-bg)");
    expect(segunda.map((cell) => cell.textContent)).toEqual(["02", "TC-002", "—", "bia.souza", "—", "—", "—"]);
    // Valor que não é Pass nem Fail aparece como veio do SDF, na etiqueta neutra; responsável fora do time vira —.
    expect(terceira[3]).toHaveTextContent("—");
    expect(terceira[4]).toHaveTextContent("Blocked");
    expect(fundoDaEtiqueta(terceira[4])).toBe("var(--etiqueta-neutro-bg)");
  });

  it("filtra por Assignee pelo cabeçalho", async () => {
    const user = userEvent.setup();
    const { onAssigneeChange } = renderTabela();

    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    await user.click(await screen.findByRole("option", { name: "bia.souza" }));

    expect(onAssigneeChange).toHaveBeenCalledWith(["bia"]);
  });

  it("sem casos para os filtros, oferece limpar os filtros", async () => {
    const user = userEvent.setup();
    const { onLimparFiltros } = renderTabela({ dados: { ...matriz, items: [], total_count: 0 }, temFiltros: true, assignee: ["bia"] });

    expect(screen.getByRole("heading", { name: "No test cases match the filters." })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onLimparFiltros).toHaveBeenCalled();
  });

  it("sem casos e sem filtros, explica que o projeto ainda não tem Test Cases", () => {
    renderTabela({ dados: { ...matriz, items: [], total_count: 0 } });

    expect(screen.getByRole("heading", { name: "No test cases yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("mostra erro acionável quando a consulta falha", () => {
    renderTabela({ dados: undefined, erro: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load the Form Factor results.");
    expect(screen.queryByRole("heading", { name: "No test cases yet" })).not.toBeInTheDocument();
  });

  it("exporta a página com uma coluna por modelo, sem número nem ações", async () => {
    const user = userEvent.setup();
    const { buscarTodos } = renderTabela({ podeRegistrar: () => true, onRegistrar: vi.fn() });

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "Current page" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^form-factor_/)));
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(itens).toEqual(matriz.items);
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["TC ID", "SDF ID", "Assignee", "SAMSUNG S25", "SAMSUNG S26", "Date"]);
    expect(colunas.map((coluna) => coluna.valor(matriz.items[1]))).toEqual(["TC-002", "—", "bia.souza", "—", "—", "—"]);
    expect(buscarTodos).not.toHaveBeenCalled();
  });
});
