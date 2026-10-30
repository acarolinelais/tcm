import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTableFilter, DataTableMultiFilter } from "./data-table-filter";

describe("DataTableFilter", () => {
  it("filtro de opções aplica a opção escolhida", async () => {
    const onChange = vi.fn();
    render(<DataTableFilter label="Status" value="" onChange={onChange} options={[{ value: "", label: "All" }, { value: "Pass", label: "Done" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "Done" }));
    expect(onChange).toHaveBeenCalledWith("Pass");
  });

  it("'All' limpa o filtro", async () => {
    const onChange = vi.fn();
    render(<DataTableFilter label="Status" value="Pass" onChange={onChange} options={[{ value: "", label: "All" }, { value: "Pass", label: "Done" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Status" }));
    await userEvent.click(await screen.findByRole("option", { name: "All" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("filtro de texto aplica o texto sem espaços nas pontas", async () => {
    const onChange = vi.fn();
    render(<DataTableFilter label="TC ID" value="" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await userEvent.type(await screen.findByRole("searchbox", { name: "TC ID" }), "  Clock ");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onChange).toHaveBeenLastCalledWith("Clock");
  });

  it("filtro de opções com busca esconde as que não batem", async () => {
    render(<DataTableFilter label="Assignee" value="" onChange={vi.fn()} searchable options={[{ value: "", label: "All" }, { value: "1", label: "caroline.silva" }, { value: "2", label: "raquel.batista" }]} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await userEvent.type(await screen.findByRole("searchbox"), "raq");
    expect(screen.queryByRole("option", { name: "caroline.silva" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "raquel.batista" })).toBeInTheDocument();
  });
});

describe("DataTableMultiFilter", () => {
  const pessoas = [{ value: "1", label: "caroline.silva" }, { value: "2", label: "raquel.batista" }, { value: "3", label: "isabel.gama" }];

  it("marca mais de uma pessoa e aplica cada escolha na hora", async () => {
    const onChange = vi.fn();
    const { rerender } = render(<DataTableMultiFilter label="Assignee" values={[]} onChange={onChange} options={pessoas} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await userEvent.click(await screen.findByRole("option", { name: "caroline.silva" }));
    expect(onChange).toHaveBeenLastCalledWith(["1"]);

    rerender(<DataTableMultiFilter label="Assignee" values={["1"]} onChange={onChange} options={pessoas} />);
    await userEvent.click(screen.getByRole("option", { name: "raquel.batista" }));
    expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);
  });

  it("Clear desmarca tudo e fica desabilitado sem seleção", async () => {
    const onChange = vi.fn();
    render(<DataTableMultiFilter label="Assignee" values={["1", "2"]} onChange={onChange} options={pessoas} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await userEvent.click(await screen.findByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("a busca esconde opções sem desmarcar as que já estavam escolhidas", async () => {
    const onChange = vi.fn();
    render(<DataTableMultiFilter label="Assignee" values={["1"]} onChange={onChange} options={pessoas} searchable />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await userEvent.type(await screen.findByRole("searchbox"), "raq");
    expect(screen.queryByRole("option", { name: "caroline.silva" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("option", { name: "raquel.batista" }));
    expect(onChange).toHaveBeenLastCalledWith(["1", "2"]);
  });

  it("Esc fecha o filtro sem limpar a seleção", async () => {
    const onChange = vi.fn();
    render(<DataTableMultiFilter label="Assignee" values={["1"]} onChange={onChange} options={pessoas} />);
    await userEvent.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    await screen.findByRole("option", { name: "caroline.silva" });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("option", { name: "caroline.silva" })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("no filtro de data, escolher um dia aplica o filtro e Limpar remove (spec 050, mesmo calendário dos filtros de semana)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<DataTableFilter label="End date" type="date" value="2026-03-10" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /End date/ }));
    await user.click(await screen.findByRole("button", { name: /March 24th, 2026/ }));
    expect(onChange).toHaveBeenLastCalledWith("2026-03-24");

    rerender(<DataTableFilter label="End date" type="date" value="2026-03-24" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /End date/ }));
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));
    expect(onChange).toHaveBeenLastCalledWith("");
  });
});

