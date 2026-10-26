import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

interface Linha { id: string; nome: string; backup: boolean }

const colunas: DataTableColumn<Linha>[] = [{ id: "nome", header: "Name", cell: (linha) => linha.nome, isRowHeader: true }];
const linhas: Linha[] = [
  { id: "a", nome: "Clock_000001", backup: true },
  { id: "b", nome: "Clock_000002", backup: false },
  { id: "c", nome: "Clock_000003", backup: true },
];

function ComSelecao({ items, onChange }: { items: Linha[]; onChange: (keys: Set<string>) => void }) {
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  return <DataTable aria-label="Test Cases" columns={colunas} items={items} selection={{
    selectedKeys: selecionadas,
    onChange: (keys) => { setSelecionadas(keys); onChange(keys); },
    rowLabel: "Select",
    selectAllLabel: "Select all",
    disabledReason: (linha) => (linha.backup ? undefined : "No backup"),
  }} />;
}

describe("DataTable", () => {
  it("renderiza as linhas e o cabeçalho", () => {
    render(<DataTable aria-label="Teams" columns={colunas} items={linhas} />);
    const tabela = screen.getByRole("grid", { name: "Teams" });
    expect(within(tabela).getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(within(tabela).getAllByRole("row")).toHaveLength(4);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("não seleciona a linha desabilitada e informa o motivo", async () => {
    const onChange = vi.fn();
    render(<ComSelecao items={linhas} onChange={onChange} />);
    const desabilitada = screen.getByRole("checkbox", { name: "Select Clock_000002" });
    expect(desabilitada).toBeDisabled();
    expect(desabilitada).toHaveAccessibleDescription("No backup");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Clock_000001" }));
    expect(onChange).toHaveBeenLastCalledWith(new Set(["a"]));
  });

  it("a caixa do cabeçalho marca só as linhas habilitadas", async () => {
    const onChange = vi.fn();
    render(<ComSelecao items={linhas} onChange={onChange} />);
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all" }));
    expect(onChange).toHaveBeenLastCalledWith(new Set(["a", "c"]));
  });

  it("só marca as chaves das linhas visíveis", () => {
    render(<DataTable aria-label="Test Cases" columns={colunas} items={linhas} selection={{
      selectedKeys: new Set(["a", "fora-da-pagina"]), onChange: vi.fn(), rowLabel: "Select", selectAllLabel: "Select all",
    }} />);
    expect(screen.getByRole("checkbox", { name: "Select Clock_000001" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Clock_000003" })).not.toBeChecked();
  });

  it("sem linhas selecionáveis, a coluna de seleção some", () => {
    render(<ComSelecao items={[linhas[1]]} onChange={vi.fn()} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("mostra o estado no corpo no lugar das linhas", () => {
    render(<DataTable aria-label="Teams" columns={colunas} items={[]} state={<p role="alert">Could not load teams.</p>} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load teams.");
    expect(within(screen.getByRole("grid")).getAllByRole("row")).toHaveLength(1);
  });
});
