import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { estadoDaTabela } from "./data-table-state";

function estado(parcial: Partial<Parameters<typeof estadoDaTabela>[0]> = {}) {
  const onClearFilters = vi.fn();
  const ui = estadoDaTabela({
    isLoading: false,
    isError: false,
    isEmpty: true,
    hasFilters: false,
    onClearFilters,
    loadingLabel: "Loading",
    errorLabel: "Could not load",
    clearFiltersLabel: "Clear filters",
    empty: { title: "No users yet", hint: "Add the first user." },
    filtered: { title: "No results", hint: "Adjust the filters." },
    ...parcial,
  });
  return { ui, onClearFilters };
}

describe("estadoDaTabela", () => {
  it("vazio sem filtro mostra título e dica, sem botão", () => {
    render(<>{estado().ui}</>);
    expect(screen.getByRole("heading", { level: 2, name: "No users yet" })).toBeInTheDocument();
    expect(screen.getByText("Add the first user.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("vazio com filtro mostra o botão que limpa os filtros", async () => {
    const { ui, onClearFilters } = estado({ hasFilters: true });
    render(<>{ui}</>);
    expect(screen.getByRole("heading", { name: "No results" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it("erro sem retry avisa com role alert, e com linhas não desenha nada", () => {
    render(<>{estado({ isError: true }).ui}</>);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load");
    expect(estado({ isEmpty: false }).ui).toBeNull();
  });
});
