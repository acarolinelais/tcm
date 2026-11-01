import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AlteracaoCasoTeste } from "../../model/projeto";
import { AlteracaoCasoTesteItem } from "./AlteracaoCasoTesteItem";

const base: AlteracaoCasoTeste = {
  campo: "status", valor_anterior: "InProgress", valor_novo: "InReview",
  usuario_nome: "Ana", usuario_perfil: "Key Person", origem: "api", alterado_em: "2026-12-28T13:00:00Z",
};

const item = (alteracao: Partial<AlteracaoCasoTeste>) => render(<ul><AlteracaoCasoTesteItem alteracao={{ ...base, ...alteracao }} /></ul>);

describe("AlteracaoCasoTesteItem", () => {
  it("mostra o campo e os valores com os rótulos traduzidos, o autor e o perfil", () => {
    item({});

    expect(screen.getByRole("listitem")).toHaveTextContent("StatusIn Progress→changed toIn Review");
    expect(screen.getByText(/Ana \(Key Person\)/)).toBeInTheDocument();
  });

  it("mostra a origem Form Factor, a criação e a inclusão de PR", () => {
    item({ origem: "form_factor" });
    expect(screen.getByText(/Form Factor/)).toBeInTheDocument();

    item({ campo: "criacao", valor_anterior: null, valor_novo: null });
    expect(screen.getByText("Test Case created")).toBeInTheDocument();

    item({ campo: "pull_request", valor_anterior: null, valor_novo: "https://pr/7" });
    expect(screen.getByText("https://pr/7")).toBeInTheDocument();
    expect(screen.getByText("PR link")).toBeInTheDocument();
  });

  it("sem autor mostra Sistema, e valor vazio ou campo desconhecido não quebra", () => {
    item({ usuario_nome: null, usuario_perfil: null, campo: "coluna_nova", valor_anterior: null, valor_novo: "x" });

    expect(screen.getByRole("listitem")).toHaveTextContent("coluna_nova—→changed tox");
    expect(screen.getByText(/^System/)).toBeInTheDocument();
  });
});
