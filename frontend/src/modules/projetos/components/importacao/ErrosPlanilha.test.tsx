import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import type { ErroPlanilhaExibivel } from "../../utils/formatar-erro-planilha";
import { ErrosPlanilha } from "./ErrosPlanilha";

const linhaInvalida = (linha: number): ErroPlanilhaExibivel[] => [
  { codigo: "valor_invalido", linha, coluna: "TC Situation", valor: "To-Do", parametros: { esperados: ["New", "New Step", "Without Changes"] } },
  { codigo: "valor_obrigatorio", linha, coluna: "Category", valor: null },
];

describe("ErrosPlanilha", () => {
  it("mostra o resumo, os problemas gerais e cada linha uma única vez com todos os problemas", async () => {
    await i18n.changeLanguage("en");
    render(<ErrosPlanilha totalLinhas={120} erros={[...linhaInvalida(4), { codigo: "app_ausente", linha: null, coluna: "App", valor: null }, ...linhaInvalida(2)]} />);

    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("2 of 120 rows need changes. Nothing was created.");
    expect(alerta).toHaveTextContent("Whole spreadsheetFill in the App column in at least one row.");
    const linhas = within(alerta).getAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent);
    expect(linhas).toEqual(["Whole spreadsheet", "Row 2", "Row 4"]);
    expect(within(alerta).getAllByText('TC Situation column: "To-Do" isn\'t valid. Use New, New Step, or Without Changes.')).toHaveLength(2);
    expect(within(alerta).getAllByText("Category column: the cell is empty.")).toHaveLength(2);
  });

  it("pagina as linhas com problema quando passam de uma página", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    const total = DEFAULT_TABLE_PAGE_SIZE + 5;
    render(<ErrosPlanilha totalLinhas={total} erros={Array.from({ length: total }, (_, index) => linhaInvalida(index + 2)).flat()} />);

    expect(screen.getByText(`${total} of ${total} rows need changes. Nothing was created.`)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(DEFAULT_TABLE_PAGE_SIZE);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getAllByRole("heading", { level: 3 }).map((titulo) => titulo.textContent)).toContain(`Row ${total + 1}`);
  });

  it("mostra as mensagens no idioma da interface", async () => {
    await i18n.changeLanguage("pt-BR");
    render(<ErrosPlanilha totalLinhas={1} erros={linhaInvalida(2)} />);

    expect(screen.getByRole("alert")).toHaveTextContent('Coluna TC Situation: "To-Do" não é válido. Use New, New Step ou Without Changes.');
    expect(screen.getByRole("heading", { name: "Linha 2" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });

  it("volta para a primeira página quando chega uma lista de erros nova", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    const total = DEFAULT_TABLE_PAGE_SIZE + 5;
    const { rerender } = render(<ErrosPlanilha totalLinhas={total} erros={Array.from({ length: total }, (_, index) => linhaInvalida(index + 2)).flat()} />);
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByRole("heading", { name: `Row ${DEFAULT_TABLE_PAGE_SIZE + 2}` })).toBeInTheDocument();

    rerender(<ErrosPlanilha totalLinhas={total} erros={linhaInvalida(7)} />);

    expect(screen.getByRole("heading", { name: "Row 7" })).toBeInTheDocument();
  });
});
