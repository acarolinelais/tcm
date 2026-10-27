import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

interface Linha { id: string; nome: string }

const colunas: DataTableColumn<Linha>[] = [{ id: "nome", header: "Name", cell: (linha) => linha.nome, isRowHeader: true }];
const linhas: Linha[] = [
  { id: "a", nome: "Clock_000001" },
  { id: "b", nome: "Clock_000002" },
  { id: "c", nome: "Clock_000003" },
];

describe("DataTable", () => {
  it("renderiza as linhas e o cabeçalho", () => {
    render(<DataTable aria-label="Teams" columns={colunas} items={linhas} />);
    const tabela = screen.getByRole("grid", { name: "Teams" });
    expect(within(tabela).getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(within(tabela).getAllByRole("row")).toHaveLength(4);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("mostra o estado no corpo no lugar das linhas", () => {
    render(<DataTable aria-label="Teams" columns={colunas} items={[]} state={<p role="alert">Could not load teams.</p>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load teams.");
    expect(within(screen.getByRole("grid")).getAllByRole("row")).toHaveLength(1);
  });
});
