import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { FiltrosPopover } from "./filtros-popover";

function renderBotao(ativos: number) {
  render(<FiltrosPopover ativos={ativos} rotuloDoPainel="Meus filtros"><button type="button">Primeiro filtro</button></FiltrosPopover>);
}

describe("FiltrosPopover", () => {
  it("abre o painel só com o teclado e o Escape o fecha, devolvendo o foco ao botão", async () => {
    const user = userEvent.setup();
    renderBotao(0);

    await user.tab();
    expect(screen.getByRole("button", { name: "Filter" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("dialog", { name: "Meus filtros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primeiro filtro" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole("button", { name: "Filter" })).toHaveFocus());
  });

  it("sem filtro ativo, não mostra contador", () => {
    renderBotao(0);

    expect(screen.getByRole("button", { name: "Filter" })).toHaveTextContent(/^Filter$/);
  });

  it("com filtros ativos, mostra o número e o leitor de tela ouve quantos são", () => {
    renderBotao(3);

    const botao = screen.getByRole("button", { name: "Filter 3 active" });
    expect(botao).toHaveTextContent("3");
  });

  it("com um filtro só, o texto lido usa o singular no idioma da pessoa", async () => {
    await i18n.changeLanguage("pt-BR");
    renderBotao(1);

    expect(screen.getByRole("button", { name: "Filtrar 1 ativo" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });
});
