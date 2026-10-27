import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { FormFactorGlobalResultadosTabela } from "./FormFactorGlobalTabela";

describe("FormFactorGlobalResultadosTabela", () => {
  it("mantém cada execução anterior em uma linha com projeto e origem", () => {
    render(<MemoryRouter><FormFactorGlobalResultadosTabela
      dados={{
        modelos: [{ id: "m1", nome: "SM-123" }],
        responsaveis: [{ id: "user-1", identificador: "ana.souza" }],
        items: [
          { execucao_id: "run-2", projeto_id: "p1", projeto_nome: "Keyboard 9.8", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", modelos_ids: ["m1"], sdf_id: null, data_reportada: "2026-10-25T12:00:00Z", origem: "MANUAL", resultados: { m1: "PASS" } },
          { execucao_id: "run-1", projeto_id: "p1", projeto_nome: "Keyboard 9.8", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", modelos_ids: ["m1"], sdf_id: "SDF-1", data_reportada: "2026-10-24T12:00:00Z", origem: "SDF", resultados: { m1: "FAIL" } },
        ],
        page: 1, page_size: 20, total_count: 2,
      }}
      carregando={false} erro={false} projetos={[]}
      filtros={{ page: 1, pageSize: 20, tcId: "", sdfId: "", responsavelId: "", modeloDispositivoId: "", resultado: "", origem: undefined, projetoId: "" }}
      onFiltroChange={vi.fn()} onLimparFiltros={vi.fn()} temFiltros={false}
      page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()}
    /></MemoryRouter>);

    expect(screen.getAllByRole("row", { name: /TC-001/ })).toHaveLength(2);
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("SDF")).toBeInTheDocument();
    expect(screen.getByText("PASS")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(within(screen.getAllByRole("row", { name: /TC-001/ })[1]).getByText("SDF-1")).toBeInTheDocument();
  });
});
