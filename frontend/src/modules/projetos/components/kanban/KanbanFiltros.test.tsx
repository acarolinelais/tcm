import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ORDEM_KANBAN, type KanbanColuna } from "../../model/projeto";
import type { FiltrosKanban } from "../../hooks/useFiltrosKanban";
import { KanbanFiltros } from "./KanbanFiltros";

const colunas: KanbanColuna[] = ORDEM_KANBAN.map((status) => ({ status, total: 0, casos: [] }));
const semFiltros: FiltrosKanban = { tc: "", responsavel: [], status: [], category: [], difficulty: [], situation: [] };

function renderFiltros(filtros: FiltrosKanban = semFiltros, ativos = false) {
  const props = { onAlterar: vi.fn(), onLimpar: vi.fn() };
  render(<KanbanFiltros colunas={colunas} filtros={filtros} ativos={ativos} {...props} />);
  return props;
}

describe("KanbanFiltros", () => {
  it("escolhe uma opção de um menu dentro do painel e fecha só o menu com o Escape", async () => {
    const user = userEvent.setup();
    const { onAlterar } = renderFiltros();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "Filter by Difficulty" }));
    await user.click(await screen.findByRole("option", { name: "High" }));
    expect(onAlterar).toHaveBeenCalledWith("difficulty", ["High"]);

    await user.keyboard("{Escape}");
    // O menu fechou, e o painel dos filtros continua aberto.
    expect(screen.queryByRole("option", { name: "High" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Kanban filters" })).toBeInTheDocument();
  });

  it("com filtros ativos, o botão mostra quantos são e Limpar filtros chama onLimpar", async () => {
    const user = userEvent.setup();
    const { onLimpar } = renderFiltros({ ...semFiltros, tc: "clock", status: ["Done", "InReview"] }, true);

    expect(screen.getByRole("button", { name: "Filter 2 active" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(onLimpar).toHaveBeenCalledOnce();
  });
});
