import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";
import type { FormFactorMatriz } from "../../model/projeto";
import { FormFactorTabela } from "./FormFactorTabela";

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
  const handlers = { onAssigneeChange: vi.fn(), onLimparFiltros: vi.fn(), onPageChange: vi.fn(), onPageSizeChange: vi.fn() };
  render(<FormFactorTabela
    dados={matriz} carregando={false} erro={false}
    identificadoresMembros={{ ana: "ana.silva", bia: "bia.souza" }}
    opcoesAssignee={[{ value: "ana", label: "ana.silva" }, { value: "bia", label: "bia.souza" }]}
    assignee="" temFiltros={false} page={1} pageSize={DEFAULT_TABLE_PAGE_SIZE}
    {...handlers} {...props}
  />);
  return handlers;
}

const linhasDoCorpo = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
// No React Aria a célula da coluna-título é rowheader e as demais, gridcell: leia na ordem das colunas.
const celulas = (linha: HTMLElement) => Array.from(linha.querySelectorAll<HTMLElement>("th, td"));
const fundoDaEtiqueta = (celula: HTMLElement) => celula.querySelector<HTMLElement>(".chip")?.style.getPropertyValue("--chip-bg");

describe("FormFactorTabela", () => {
  it("mostra uma coluna por modelo, o resultado de cada caso e — onde não há resultado", () => {
    renderTabela();

    const cabecalhos = screen.getAllByRole("columnheader").map((header) => header.textContent);
    expect(cabecalhos).toEqual(["", "TC ID", "SDF ID", "Assignee", "SAMSUNG S25", "SAMSUNG S26", "Date"]);
    expect(screen.queryByRole("columnheader", { name: "One UI Version" })).not.toBeInTheDocument();

    const [primeira, segunda, terceira] = linhasDoCorpo().map(celulas);
    expect(primeira.map((cell) => cell.textContent)).toEqual(["01", "TC-001", "SDF-10", "ana.silva", "PASS", "Fail", expect.stringMatching(/2026/)]);
    expect(fundoDaEtiqueta(primeira[4])).toBe("#DCF7E8");
    expect(fundoDaEtiqueta(primeira[5])).toBe("#FDEEEE");
    expect(segunda.map((cell) => cell.textContent)).toEqual(["02", "TC-002", "—", "bia.souza", "—", "—", "—"]);
    // Valor que não é Pass nem Fail aparece como veio do SDF, sem badge; responsável fora do time vira —.
    expect(terceira[3]).toHaveTextContent("—");
    expect(terceira[4]).toHaveTextContent("Blocked");
    expect(terceira[4].querySelector(".chip")).toBeNull();
  });

  it("filtra por Assignee pelo cabeçalho", async () => {
    const user = userEvent.setup();
    const { onAssigneeChange } = renderTabela();

    await user.click(screen.getByRole("button", { name: /Filter by Assignee/i }));
    await user.click(await screen.findByRole("option", { name: "bia.souza" }));

    expect(onAssigneeChange).toHaveBeenCalledWith("bia");
  });

  it("sem casos para os filtros, oferece limpar os filtros", async () => {
    const user = userEvent.setup();
    const { onLimparFiltros } = renderTabela({ dados: { ...matriz, items: [], total_count: 0 }, temFiltros: true, assignee: "bia" });

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
});
