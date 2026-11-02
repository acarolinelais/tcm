import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import type { PlanilhaProjeto } from "../../utils/planilha-projeto";
import { PreviaPlanilha } from "./PreviaPlanilha";

function previa(total: number): PlanilhaProjeto {
  return {
    app: "Clock",
    one_ui: "9.5",
    totalLinhas: total,
    colunas: { app: "App", "tc id": "TC ID", difficulty: "Difficulty", category: "Category", "tc situation": "TC Situation", "one ui": "One UI", assignees: "Assignees", backup: "Backup", "automation level": "Automation Level",
      "title(english)": "Title(English)", "test precondition(english)": "Test Precondition(English)", "test procedure(english)": "Test Procedure(English)", "expected result(english)": "Expected Result(English)" },
    casos: Array.from({ length: total }, (_, index) => ({
      linha: index + 2, tc_id: `Clock_${String(index + 1).padStart(4, "0")}`, category: "A", difficulty: "Low",
      situation: "New Step", responsavel: "Daniel Oliveira", backup: "Kaique Pereira", automation_level: null,
      title: null, precondition: null, procedure: null, expected_result: null,
    })),
  };
}

const linhasDoCorpo = () => within(screen.getAllByRole("rowgroup")[1]).getAllByRole("row");
// No React Aria a primeira célula é rowheader e as demais, gridcell: leia na ordem das colunas.
const celulas = (linha: HTMLElement) => Array.from(linha.querySelectorAll<HTMLElement>("th, td"));
const molduraDaPrevia = () => screen.getByRole("region", { name: "Test Case preview" }).lastElementChild;

describe("PreviaPlanilha", () => {
  it("pagina 1.000 casos, 20 por página, com anterior e próxima, e sem total no rodapé", async () => {
    const user = userEvent.setup();
    render(<PreviaPlanilha previa={previa(1000)} />);

    expect(screen.getByText("1,000 Test Cases")).toBeInTheDocument();
    expect(screen.queryByText("1000 total")).not.toBeInTheDocument();
    expect(linhasDoCorpo()).toHaveLength(DEFAULT_TABLE_PAGE_SIZE);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText(`Clock_${String(DEFAULT_TABLE_PAGE_SIZE + 1).padStart(4, "0")}`)).toBeInTheDocument();
    expect(screen.queryByText("Clock_0001")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous page" }));
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
    const niveis = linhasDoCorpo().map((linha) => celulas(linha)[colunas.indexOf("Automation Level")].textContent);
    expect(niveis).toEqual(["1 – Not automatable", "—", "3 – 100% automatable"]);
  });

  it("mantém a altura fixa só quando há mais de uma página", () => {
    const { rerender } = render(<PreviaPlanilha previa={previa(DEFAULT_TABLE_PAGE_SIZE + 1)} />);
    expect(molduraDaPrevia()).toHaveClass("h-[30rem]");

    rerender(<PreviaPlanilha previa={previa(3)} />);
    expect(molduraDaPrevia()).toHaveClass("max-h-[30rem]");
    expect(molduraDaPrevia()).not.toHaveClass("h-[30rem]");
  });
});
