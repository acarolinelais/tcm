import { render, screen, waitFor } from "@testing-library/react";
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
  it("abre o painel só com o teclado, e o Escape o fecha devolvendo o foco ao botão", async () => {
    const user = userEvent.setup();
    renderFiltros();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", { name: "Filter" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Kanban filters" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter by Assignee" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // O foco volta ao botão depois da animação de saída.
    await waitFor(() => expect(screen.getByRole("button", { name: "Filter" })).toHaveFocus());
  });

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

  it("sem filtro ativo, não mostra contador nem Limpar filtros", async () => {
    const user = userEvent.setup();
    renderFiltros();

    expect(screen.getByRole("button", { name: "Filter" })).toHaveTextContent(/^Filter$/);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
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
