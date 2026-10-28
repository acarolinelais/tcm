import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/ui/table";
import type { PlanilhaProjeto } from "../../utils/planilha-projeto";
import { PreviaPlanilha } from "./PreviaPlanilha";

function previa(total: number): PlanilhaProjeto {
  return {
    app: "Clock",
    one_ui: "9.5",
    totalLinhas: total,
    colunas: { app: "App", "tc id": "TC ID", difficulty: "Difficulty", category: "Category", "tc situation": "TC Situation", "one ui": "One UI", assignees: "Assignees", backup: "Backup", "automation level": "Automation Level" },
    casos: Array.from({ length: total }, (_, index) => ({
      linha: index + 2, tc_id: `Clock_${String(index + 1).padStart(4, "0")}`, category: "A", difficulty: "Low",
      situation: "New Step", responsavel: "Daniel Oliveira", backup: "Kaique Pereira", automation_level: null,
    })),
  };
}

const linhasDoCorpo = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");

describe("PreviaPlanilha", () => {
  it("mostra o total e pagina 1.000 casos com primeira, anterior, próxima e última página", async () => {
    const user = userEvent.setup();
    const totalPaginas = Math.ceil(1000 / DEFAULT_TABLE_PAGE_SIZE);
    render(<PreviaPlanilha previa={previa(1000)} />);

    expect(screen.getByText("1,000 Test Cases")).toBeInTheDocument();
    expect(linhasDoCorpo()).toHaveLength(DEFAULT_TABLE_PAGE_SIZE);
    expect(screen.getByText(`Page 1 of ${totalPaginas}`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText(`Clock_${String(DEFAULT_TABLE_PAGE_SIZE + 1).padStart(4, "0")}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(screen.getByText(`Page ${totalPaginas} of ${totalPaginas}`)).toBeInTheDocument();
    expect(screen.getByText("Clock_1000")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(screen.getByText(`Page ${totalPaginas - 1} of ${totalPaginas}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "First page" }));
    expect(screen.getByText("Clock_0001")).toBeInTheDocument();
  });

  it("mostra TC Situation e não mostra Status", () => {
    render(<PreviaPlanilha previa={previa(1)} />);

    expect(screen.getByRole("columnheader", { name: "TC Situation" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Status" })).not.toBeInTheDocument();
    expect(screen.getByText("New Step")).toBeInTheDocument();
  });

  it("mostra o Automation Level depois de Category, com o rótulo do nível ou um traço quando vazio", () => {
    const base = previa(3);
    base.casos = base.casos.map((caso, indice) => ({ ...caso, automation_level: ([1, null, 3] as const)[indice] }));
    render(<PreviaPlanilha previa={base} />);

    const colunas = screen.getAllByRole("columnheader").map((coluna) => coluna.textContent);
    expect(colunas.indexOf("Automation Level")).toBe(colunas.indexOf("Category") + 1);
    const celulas = linhasDoCorpo().map((linha) => within(linha).getAllByRole("cell")[colunas.indexOf("Automation Level")].textContent);
    expect(celulas).toEqual(["1 – Not automatable", "—", "3 – 100% automatable"]);
  });

  it("mantém a altura fixa só quando há mais de uma página", () => {
    const { rerender } = render(<PreviaPlanilha previa={previa(DEFAULT_TABLE_PAGE_SIZE + 1)} />);
    const rolagem = () => screen.getByRole("table").closest(".thin-scroll");
    expect(rolagem()).toHaveClass("h-96");

    rerender(<PreviaPlanilha previa={previa(3)} />);
    expect(rolagem()).toHaveClass("max-h-96");
    expect(rolagem()).not.toHaveClass("h-96");
  });
});
