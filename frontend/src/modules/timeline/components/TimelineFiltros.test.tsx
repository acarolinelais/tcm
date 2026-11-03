import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { FiltrosTimeline } from "../model/timeline";
import { TimelineFiltros } from "./TimelineFiltros";

const pessoas = [{ value: "ana", label: "Ana" }, { value: "bia", label: "Bia" }];
const casos = [{ value: "c46", label: "Clock_00046", description: "Alarme" }];
const SEM_FILTROS: FiltrosTimeline = { responsavelIds: [], casoIds: [] };

function renderFiltros(filtros = SEM_FILTROS) {
  const props = { onAlterar: vi.fn(), onLimpar: vi.fn() };
  render(<TimelineFiltros opcoesPessoas={pessoas} opcoesCasos={casos} filtros={filtros} {...props} />);
  return props;
}

describe("TimelineFiltros", () => {
  it("escolhe uma pessoa na lista dentro do painel, e o Escape fecha primeiro a lista e depois o painel", async () => {
    const user = userEvent.setup();
    const { onAlterar } = renderFiltros();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "People" }));
    await user.click(await screen.findByRole("option", { name: "Ana" }));
    expect(onAlterar).toHaveBeenCalledWith({ responsavelIds: ["ana"], casoIds: [] });

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("option", { name: "Ana" })).not.toBeInTheDocument(), { timeout: 3000 });
    // O painel dos filtros continua aberto.
    expect(screen.getByRole("dialog", { name: "Timeline filters" })).toBeInTheDocument();
    await waitFor(async () => {
      await user.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("filtra Test Cases buscando pelo título", async () => {
    const user = userEvent.setup();
    const { onAlterar } = renderFiltros();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "Test Cases" }));
    await user.type(await screen.findByRole("searchbox"), "alarme");
    await user.click(screen.getByRole("option", { name: /Clock_00046/ }));
    expect(onAlterar).toHaveBeenCalledWith({ responsavelIds: [], casoIds: ["c46"] });
  });

  it("sem filtro, não mostra contador nem Limpar filtros", async () => {
    const user = userEvent.setup();
    renderFiltros();

    expect(screen.getByRole("button", { name: "Filter" })).toHaveTextContent(/^Filter$/);
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("com os dois filtros ativos, mostra 2 e Limpar filtros chama onLimpar", async () => {
    const user = userEvent.setup();
    const { onLimpar } = renderFiltros({ responsavelIds: ["ana"], casoIds: ["c46"] });

    expect(screen.getByRole("button", { name: "Filter 2 active" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(onLimpar).toHaveBeenCalledOnce();
  });
});
