import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FormFactorGlobalTabela } from "./FormFactorGlobalTabela";

const filtros = { page: 1, pageSize: 20, projetoId: "", responsavelId: "", tcId: "", sdfId: "", modeloDispositivoId: "", resultado: "" };

describe("FormFactorGlobalTabela", () => {
  it("distingue modelo não associado de modelo aplicável sem resultado e mantém o link do projeto", async () => {
    const onAbrirDetalhes = vi.fn();
    render(<MemoryRouter><FormFactorGlobalTabela
      dados={{
        modelos: [{ id: "m1", nome: "SM-123" }, { id: "m2", nome: "SM-9292" }],
        responsaveis: [{ id: "user-1", identificador: "ana.souza" }],
        items: [
          { projeto_id: "project-1", projeto_nome: "Keyboard 9.8", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", modelos_ids: ["m1"], sdf_id: "SDF-1", data_reportada: "2026-10-25T12:00:00Z", resultados: { m1: "PASS" } },
          { projeto_id: "project-1", projeto_nome: "Keyboard 9.8", caso_teste_id: "case-2", tc_id: "TC-002", responsavel_id: "user-1", modelos_ids: ["m1", "m2"], sdf_id: null, data_reportada: null, resultados: { m1: "FAIL" } },
        ],
        page: 1, page_size: 20, total_count: 2,
      }}
      carregando={false} erro={false} projetos={[]} filtros={filtros}
      onFiltroChange={vi.fn()} onAbrirDetalhes={onAbrirDetalhes} onLimparFiltros={vi.fn()} temFiltros={false}
      page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()}
    /></MemoryRouter>);

    const row = screen.getByRole("row", { name: /TC-001/ });
    expect(within(row).getByText("N/A")).toBeInTheDocument();
    expect(within(row).getByText("PASS")).toBeInTheDocument();
    const secondRow = screen.getByRole("row", { name: /TC-002/ });
    expect(within(secondRow).getByLabelText("No result recorded")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Keyboard 9.8" })).toHaveAttribute("href", "/projetos/project-1");
    expect(screen.getByRole("button", { name: "Filter by Project" })).toBeInTheDocument();

    // Spec 030: o TC ID abre o painel do caso; o nome do projeto continua navegando.
    await userEvent.click(within(row).getByRole("button", { name: "TC-001" }));
    expect(onAbrirDetalhes).toHaveBeenCalledWith({ id: "case-1", tc_id: "TC-001" });
  });
});
