import { describe, expect, it } from "vitest";

import { ORDEM_GUIAS } from "../model/guia";
import { en } from "./en";
import { ko } from "./ko";
import { ptBR } from "./pt-BR";

const forma = (guias: Partial<typeof en>) =>
  ORDEM_GUIAS.map((slug) => guias[slug]?.secoes.map(({ itens }) => itens?.length ?? 0));

describe("traduções dos guias", () => {
  it.each([["pt-BR", ptBR], ["ko", ko]])("%s tem todos os guias com as mesmas seções e itens do inglês", (_, guias) => {
    expect(forma(guias)).toEqual(forma(en));
  });

  it("acusa um guia que falta", () => {
    const semGlossario = { ...ptBR, glossary: undefined };
    expect(forma(semGlossario)).not.toEqual(forma(en));
  });
});
