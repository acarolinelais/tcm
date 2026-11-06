import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { baixarPlanilha, montarPlanilha } from "@/shared/lib/exportar-planilha";
import { FormFactorResultadosTabela } from "./FormFactorResultadosTabela";

vi.mock("@/shared/lib/exportar-planilha");

describe("FormFactorResultadosTabela", () => {
  it("exibe uma linha por rodada e colunas por modelo, origem e data", () => {
    render(<FormFactorResultadosTabela onAbrirDetalhes={vi.fn()} onAbrirHistorico={vi.fn()} dados={{ modelos: [{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }], items: [
      { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL", resultados: { m1: "FAIL" } },
      { execucao_id: "run-2", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-1", data_reportada: "2026-03-24T10:00:00Z", origem: "SDF", resultados: { m1: "PASS", m2: "PASS" } },
      { execucao_id: "run-3", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-2", data_reportada: "2026-03-25T10:00:00Z", origem: "SDF", resultados: { m1: "BLOCKED" } },
    ], page: 1, page_size: 20, total_count: 3 }} carregando={false} erro={false} identificadoresMembros={{ "user-1": "ana" }} opcoesAssignee={[{ value: "user-1", label: "ana", searchText: "Ana Pereira" }]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} buscarTodos={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getAllByRole("columnheader").map((item) => item.textContent)).toEqual(["TC ID", "SDF ID", "Assignee", "Origin", "S25", "S26", "Date", "Actions"]);
    const rows = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
    expect(rows).toHaveLength(3);
    const celulas = (linha: HTMLElement) => Array.from(linha.querySelectorAll<HTMLElement>("th, td"));
    expect(celulas(rows[0]).map((cell) => cell.textContent)).toEqual(["TC-001", "—", "ana", "Manual", "FAIL", "—", expect.stringContaining("3/23/26"), ""]);
    expect(celulas(rows[0])[4].querySelector(".chip")).not.toBeNull();
    expect(celulas(rows[2])[4]).toHaveTextContent("BLOCKED");
    // Valor que não é PASS nem FAIL também vira etiqueta, no tom neutro.
    expect(celulas(rows[2])[4].querySelector<HTMLElement>(".chip")?.style.getPropertyValue("--chip-bg")).toBe("var(--etiqueta-neutro-bg)");
  });

  it("o TC ID abre o painel do caso da rodada (spec 030)", async () => {
    const onAbrirDetalhes = vi.fn();
    render(<FormFactorResultadosTabela onAbrirDetalhes={onAbrirDetalhes} onAbrirHistorico={vi.fn()} dados={{ modelos: [], items: [
      { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL", resultados: {} },
    ], page: 1, page_size: 20, total_count: 1 }} carregando={false} erro={false} identificadoresMembros={{}} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} buscarTodos={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "TC-001" }));

    expect(onAbrirDetalhes).toHaveBeenCalledWith({ id: "case-1", tc_id: "TC-001" });
  });

  it("sem execuções para os filtros, oferece limpar os filtros", async () => {
    const onLimparFiltros = vi.fn();
    render(<FormFactorResultadosTabela onAbrirDetalhes={vi.fn()} onAbrirHistorico={vi.fn()} dados={{ modelos: [], items: [], page: 1, page_size: 20, total_count: 0 }} carregando={false} erro={false} identificadoresMembros={{}} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "TC-9", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={onLimparFiltros} buscarTodos={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "No results found" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onLimparFiltros).toHaveBeenCalled();
  });

  it("mostra o erro no lugar da lista quando a consulta falha", () => {
    render(<FormFactorResultadosTabela onAbrirDetalhes={vi.fn()} onAbrirHistorico={vi.fn()} dados={undefined} carregando={false} erro identificadoresMembros={{}} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} buscarTodos={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load results.");
  });

  it("exporta todas as execuções pela busca da tela, com uma coluna por modelo", async () => {
    const execucao = { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: null, data_reportada: "2026-03-23T10:00:00Z", origem: "MANUAL" as const, resultados: { m1: "FAIL" } };
    const outra = { ...execucao, execucao_id: "run-9", tc_id: "TC-009", sdf_id: "SDF-9", origem: "SDF" as const, resultados: { m2: "PASS" } };
    const buscarTodos = vi.fn(async () => [execucao, outra]);
    const user = userEvent.setup();
    render(<FormFactorResultadosTabela onAbrirDetalhes={vi.fn()} onAbrirHistorico={vi.fn()} dados={{ modelos: [{ id: "m1", nome: "S25" }, { id: "m2", nome: "S26" }], items: [execucao], page: 1, page_size: 20, total_count: 2 }} carregando={false} erro={false} identificadoresMembros={{ "user-1": "ana" }} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()} filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroChange={vi.fn()} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()} buscarTodos={buscarTodos} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^form-factor-resultados_/)));
    const [colunas, itens] = vi.mocked(montarPlanilha).mock.calls[0];
    expect(itens).toEqual([execucao, outra]);
    expect(colunas.map((coluna) => coluna.titulo)).toEqual(["TC ID", "SDF ID", "Assignee", "Origin", "S25", "S26", "Date"]);
    expect(colunas.slice(0, 6).map((coluna) => coluna.valor(outra))).toEqual(["TC-009", "SDF-9", "ana", "Spreadsheet", "—", "PASS"]);
  });

  describe("origem e histórico (spec 058)", () => {
    const execucao = { execucao_id: "run-1", caso_teste_id: "case-1", tc_id: "TC-001", responsavel_id: "user-1", sdf_id: "SDF-1", data_reportada: "2026-03-23T10:00:00Z", origem: "SDF" as const, resultados: { m1: "PASS" } };
    const manual = { ...execucao, execucao_id: "run-2", sdf_id: null, origem: "MANUAL" as const };

    function montar(extra: Partial<Parameters<typeof FormFactorResultadosTabela>[0]> = {}) {
      const props = { onAbrirHistorico: vi.fn(), onFiltroChange: vi.fn() };
      render(<FormFactorResultadosTabela
        onAbrirDetalhes={vi.fn()}
        dados={{ modelos: [{ id: "m1", nome: "S25" }], items: [execucao, manual], page: 1, page_size: 20, total_count: 2 }}
        carregando={false} erro={false} identificadoresMembros={{ "user-1": "ana" }} opcoesAssignee={[]} responsaveis={[]} onResponsaveisChange={vi.fn()}
        filtros={{ tcId: "", sdfId: "", origem: "", modeloDispositivoId: "", resultado: "" }} onFiltroResultado={vi.fn()} onLimparFiltros={vi.fn()}
        buscarTodos={vi.fn()} page={1} pageSize={20} onPageChange={vi.fn()} onPageSizeChange={vi.fn()} {...props} {...extra}
      />);
      return props;
    }

    it("mostra Spreadsheet no lugar de SDF na célula e no filtro, e filtra pelo valor guardado SDF", async () => {
      const { onFiltroChange } = montar();
      const user = userEvent.setup();

      const linhas = within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
      const origem = (linha: HTMLElement) => linha.querySelectorAll("th, td")[3].textContent;
      expect([origem(linhas[0]), origem(linhas[1])]).toEqual(["Spreadsheet", "Manual"]);

      await user.click(screen.getByRole("button", { name: "Filter by Origin" }));
      expect(screen.queryByRole("option", { name: "SDF" })).not.toBeInTheDocument();
      await user.click(await screen.findByRole("option", { name: "Spreadsheet" }));
      expect(onFiltroChange).toHaveBeenCalledWith("origem", "SDF");
    });

    it("o ícone de histórico abre o caso com o ID do tester da linha", async () => {
      const { onAbrirHistorico } = montar();

      await userEvent.click(screen.getAllByRole("button", { name: "View execution history TC-001" })[0]);

      expect(onAbrirHistorico).toHaveBeenCalledWith({ caso_teste_id: "case-1", tc_id: "TC-001", responsavel_identificador: "ana" });
    });

    it("sem Assignee (perfil dev), tira a coluna e o filtro, e mantém o histórico", () => {
      montar({ mostrarAssignee: false });

      const titulos = screen.getAllByRole("columnheader").map((item) => item.textContent);
      expect(titulos).toEqual(["TC ID", "SDF ID", "Origin", "S25", "Date", "Actions"]);
      expect(screen.queryByRole("button", { name: /Assignee/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: "View execution history TC-001" })).toHaveLength(2);
    });
  });
});
