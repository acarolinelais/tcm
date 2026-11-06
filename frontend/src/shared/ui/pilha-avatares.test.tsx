import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PilhaAvatares } from "./pilha-avatares";

const nomes = ["Ana", "Bia", "Caio", "Dani", "Edu", "Fabi"];
const pessoas = (quantas: number) => nomes.slice(0, quantas).map((nome) => ({ id: nome, nome, cor_avatar: "azul" as const }));
const textos = { rotulo: "Assignees", rotuloMais: (quantidade: number) => `${quantidade} more` };

describe("PilhaAvatares", () => {
  it("mostra cinco avatares e +1 com seis pessoas", () => {
    render(<PilhaAvatares pessoas={pessoas(6)} {...textos} />);

    const lista = screen.getByRole("list", { name: "Assignees" });
    expect(lista.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getByLabelText("Ana")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fabi")).not.toBeInTheDocument();
    expect(screen.getByLabelText("1 more")).toHaveTextContent("+1");
  });

  it("com cinco pessoas, não mostra o +N", () => {
    render(<PilhaAvatares pessoas={pessoas(5)} {...textos} />);

    expect(screen.getByRole("list", { name: "Assignees" }).querySelectorAll("li")).toHaveLength(5);
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it("sem ninguém, não mostra a pilha (falha)", () => {
    const { container } = render(<PilhaAvatares pessoas={[]} {...textos} />);

    expect(container).toBeEmptyDOMElement();
  });
});
