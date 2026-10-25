import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormFactorResultadosTabela } from "./FormFactorResultadosTabela";

describe("FormFactorResultadosTabela", () => {
  it("exibe uma linha por rodada e colunas por modelo, origem e data", () => {
    render(<FormFactorResultadosTabela dados={{ modelos: [{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }], items: [
      { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL", resultados: { m1: "FAIL" } },
      { execucao_id: "run-2", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-1", data_reportada: "2026-03-24T10:00:00Z", origem: "SDF", resultados: { m1: "PASS", m2: "PASS" } },
      { execucao_id: "run-3", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-2", data_reportada: "2026-03-25T10:00:00Z", origem: "SDF", resultados: { m1: "BLOCKED" } },
    ], page: 1, page_size: 20, total_count: 3 }} carregando={false} erro={false} identificadoresMembros={{ "user-1": "ana" }} opcoesAssignee={[{ value: "user-1", label: "ana", searchText: "Ana Pereira" }]} filtros={{ tcId: "", sdfId: "", responsavelId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getAllByRole("columnheader").map((item) => item.textContent)).toEqual(["TC ID", "SDF ID", "Assignee", "Origin", "S25", "S26", "Date"]);
    const rows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["TC-001", "—", "ana", "Manual", "FAIL", "—", expect.stringContaining("2026")]);
    expect(within(rows[2]).getAllByRole("cell")[4]).toHaveTextContent("BLOCKED");
    expect(within(rows[2]).getAllByRole("cell")[4].querySelector(".bg-red-50, .bg-green-50")).toBeNull();
  });
});
