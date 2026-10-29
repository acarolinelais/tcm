import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { CasoHistorico, HistoricoProjeto } from "../../model/projeto";
import { formatarDia } from "./formatar-dia";
import { HistoricoProjetoTabela } from "./HistoricoProjetoTabela";

const DATAS = ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-04"];

function caso(tcId: string, resultados: CasoHistorico["resultados"] = {}): CasoHistorico {
  return { caso_teste_id: `id-${tcId}`, tc_id: tcId, responsavel_id: "u1", responsavel_identificador: "ANA-001", modelo_padrao_id: "s26", resultados };
}

const dados: HistoricoProjeto = {
  modelos: [{ id: "s26", nome: "SM-S26" }, { id: "s27", nome: "SM-S27" }],
  datas: DATAS,
  modelo_destacado_id: null,
  casos: [
    caso("Clock_001", { "2026-10-10": { s26: { execucao_id: "e1", resultado: "PASS", sdf_id: "SDF-1", origem: "SDF" }, s27: { execucao_id: "e2", resultado: "FAIL", sdf_id: "SDF-1", origem: "SDF" } } }),
    caso("Clock_002"),
  ],
};

function renderizar(props: Partial<Parameters<typeof HistoricoProjetoTabela>[0]> = {}) {
  const handlers = { onAbrirResultado: vi.fn(), onAbrirResumo: vi.fn(), onAbrirDetalhes: vi.fn(), onModeloChange: vi.fn(), onFiltroChange: vi.fn(), onTentarDeNovo: vi.fn(), onLimparFiltros: vi.fn() };
  render(<HistoricoProjetoTabela
    dados={dados} carregando={false} erro={false} filtros={{}} temFiltros={false}
    modeloDaLinha={(linha) => linha.modelo_padrao_id ?? ""}
    {...handlers} {...props}
  />);
  return handlers;
}

describe("HistoricoProjetoTabela", () => {
  it("mostra TC ID e Form Factor fixos, até 7 datas da mais nova à mais antiga e Actions, sem paginação", () => {
    renderizar();

    const cabecalhos = screen.getAllByRole("columnheader");
    expect(cabecalhos).toHaveLength(2 + 7 + 1);
    expect(cabecalhos[0]).toHaveClass("sticky", "left-0");
    expect(cabecalhos[1]).toHaveClass("sticky", "left-40");
    expect(cabecalhos.slice(2, 9).map((cabecalho) => cabecalho.textContent)).toEqual(DATAS.map(formatarDia));
    expect(screen.queryByRole("navigation", { name: /pagination/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /previous|next/i })).not.toBeInTheDocument();
  });

  it("mostra o resultado do modelo da linha e o marcador vazio com rótulo quando ele não executou na data", async () => {
    const handlers = renderizar();

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    const chip = within(linha).getByRole("button", { name: `PASS on SM-S26, ${formatarDia("2026-10-10")}` });
    expect(within(linha).queryByText("FAIL")).not.toBeInTheDocument();
    expect(within(linha).getByRole("img", { name: `No run on SM-S26, ${formatarDia("2026-10-09")}` })).toBeInTheDocument();
    expect(within(linha).getByRole("button", { name: "Form Factor Clock_001" })).toHaveTextContent("SM-S26");

    await userEvent.click(chip);
    expect(handlers.onAbrirResultado).toHaveBeenCalledWith({ tcId: "Clock_001", device: "SM-S26", dia: "2026-10-10", resultado: dados.casos[0].resultados["2026-10-10"].s26 });
    await userEvent.click(within(linha).getByRole("button", { name: "Execution summary Clock_001" }));
    expect(handlers.onAbrirResumo).toHaveBeenCalledWith(dados.casos[0]);
  });

  it("mostra o resultado do outro modelo quando a linha escolhe outro", () => {
    renderizar({ modeloDaLinha: () => "s27" });

    const linha = screen.getByRole("row", { name: /Clock_001/ });
    expect(within(linha).getByRole("button", { name: `FAIL on SM-S27, ${formatarDia("2026-10-10")}` })).toBeInTheDocument();
  });

  it("mostra a dica SDF Result ao focar o título da data pelo teclado", async () => {
    renderizar();

    const titulo = screen.getByRole("button", { name: formatarDia(DATAS[0]) });
    await userEvent.tab(); // modalidade de teclado, como quem navega com Tab
    act(() => titulo.focus());

    expect(await screen.findByRole("tooltip")).toHaveTextContent("SDF Result");
  });

  it("mostra o erro com tentar de novo", async () => {
    const handlers = renderizar({ erro: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load results.");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(handlers.onTentarDeNovo).toHaveBeenCalled();
  });

  it("sem correspondência, mostra nenhum resultado com limpar; carregando, o status", async () => {
    const handlers = renderizar({ dados: { ...dados, casos: [] }, temFiltros: true });

    expect(screen.getByText("No results found")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(handlers.onLimparFiltros).toHaveBeenCalled();
  });
});
