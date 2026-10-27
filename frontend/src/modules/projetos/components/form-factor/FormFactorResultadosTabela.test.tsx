import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormFactorResultadosTabela } from "./FormFactorResultadosTabela";

describe("FormFactorResultadosTabela", () => {
  it("exibe uma linha por rodada e colunas por modelo, origem e data", () => {
    render(<FormFactorResultadosTabela dados={{ modelos: [{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }], items: [
      { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL", resultados: { m1: "FAIL" } },
      { execucao_id: "run-2", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-1", data_reportada: "2026-03-24T10:00:00Z", origem: "SDF", resultados: { m1: "PASS", m2: "PASS" } },
      { execucao_id: "run-3", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-2", data_reportada: "2026-03-25T10:00:00Z", origem: "SDF", resultados: { m1: "BLOCKED" } },
    ], page: 1, page_size: 20, total_count: 3 }} carregando={false} erro={false} identificadoresMembros={{ "user-1": "ana" }} opcoesAssignee={[{ value: "user-1", label: "ana", searchText: "Ana Pereira" }]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getAllByRole("columnheader").map((item) => item.textContent)).toEqual(["TC ID", "SDF ID", "Assignee", "Origin", "S25", "S26", "Date"]);
    const rows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(rows).toHaveLength(3);
    const celulas = (linha: HTMLElement) => Array.from(linha.querySelectorAll<HTMLElement>("th, td"));
    expect(celulas(rows[0]).map((cell) => cell.textContent)).toEqual(["TC-001", "—", "ana", "Manual", "FAIL", "—", expect.stringContaining("3/23/26")]);
    expect(celulas(rows[0])[4].querySelector(".chip")).not.toBeNull();
    expect(celulas(rows[2])[4]).toHaveTextContent("BLOCKED");
    expect(celulas(rows[2])[4].querySelector(".chip")).toBeNull();
  });

  it("sem execuções para os filtros, oferece limpar os filtros", async () => {
    const onLimparFiltros = vi.fn();
    render(<FormFactorResultadosTabela dados={{ modelos: [], items: [], page: 1, page_size: 20, total_count: 0 }} carregando={false} erro={false} identificadoresMembros={{}} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "TC-9", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={onLimparFiltros} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "No results found" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onLimparFiltros).toHaveBeenCalled();
  });

  it("mostra o erro no lugar da lista quando a consulta falha", () => {
    render(<FormFactorResultadosTabela dados={undefined} carregando={false} erro identificadoresMembros={{}} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load results.");
  });
});
