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
    data_planejada: null,
    totalLinhas: total,
    colunas: { app: "App", "tc id": "TC ID", difficulty: "Difficulty", category: "Category", "tc situation": "TC Situation", "one ui": "One UI", assignees: "Assignees", backup: "Backup", "automation level": "Automation Level", "planned date": "Planned date",
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

  it("mostra a Planned date lida da planilha só quando ela existe (spec 075)", () => {
    const { rerender } = render(<PreviaPlanilha previa={{ ...previa(1), data_planejada: "2026-12-19" }} />);
    expect(screen.getByText(/Planned date: Dec 19, 2026/)).toBeInTheDocument();

    rerender(<PreviaPlanilha previa={previa(1)} />);
    expect(screen.queryByText(/Planned date/)).not.toBeInTheDocument();
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
    expect(niveis).toEqual(["1 - Not automatable", "—", "3 - Automatable"]);
  });

  it("mantém a altura fixa só quando há mais de uma página", () => {
    const { rerender } = render(<PreviaPlanilha previa={previa(DEFAULT_TABLE_PAGE_SIZE + 1)} />);
    expect(molduraDaPrevia()).toHaveClass("h-[30rem]");

    rerender(<PreviaPlanilha previa={previa(3)} />);
    expect(molduraDaPrevia()).toHaveClass("max-h-[30rem]");
    expect(molduraDaPrevia()).not.toHaveClass("h-[30rem]");
  });

  it("começa visível e esconde só a tabela, mantendo título, projeto e quantidade", async () => {
    const user = userEvent.setup();
    render(<PreviaPlanilha previa={previa(30)} />);

    const botao = screen.getByRole("button", { name: "Hide preview" });
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("grid")).toBeInTheDocument();

    await user.click(botao);
    expect(screen.queryByRole("grid")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Test Case preview" })).toBeInTheDocument();
    expect(screen.getByText("Project: Clock 9.5")).toBeInTheDocument();
    expect(screen.getByText("30 Test Cases")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show preview" })).toHaveAttribute("aria-expanded", "false");
  });

  it("mostra de novo na mesma página e com o mesmo tamanho de página", async () => {
    const user = userEvent.setup();
    render(<PreviaPlanilha previa={previa(1000)} />);
    await user.click(screen.getByRole("button", { name: /Items per page/ }));
    await user.click(await screen.findByRole("option", { name: "50" }));
    await user.click(screen.getByRole("button", { name: "Page 3" }));

    await user.click(screen.getByRole("button", { name: "Hide preview" }));
    await user.click(screen.getByRole("button", { name: "Show preview" }));

    expect(linhasDoCorpo()).toHaveLength(50);
    expect(screen.getByText("Clock_0101")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute("aria-current", "page");
  });

  it("planilha nova começa visível e na primeira página, mesmo com a anterior escondida", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PreviaPlanilha previa={previa(100)} />);
    await user.click(screen.getByRole("button", { name: "Page 2" }));
    await user.click(screen.getByRole("button", { name: "Hide preview" }));

    rerender(<PreviaPlanilha previa={previa(100)} />);
    expect(screen.getByRole("button", { name: "Hide preview" })).toBeInTheDocument();
    expect(screen.getByText("Clock_0001")).toBeInTheDocument();
  });
});
