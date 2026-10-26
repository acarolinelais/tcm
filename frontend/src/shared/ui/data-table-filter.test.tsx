import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataTableFilter } from "./data-table-filter";

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
