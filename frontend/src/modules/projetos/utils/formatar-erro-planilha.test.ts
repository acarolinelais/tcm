import { describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { resources } from "@/core/i18n/resources";
import { CODIGOS_ERRO_PLANILHA as codigos } from "../model/projeto";
import { agruparErrosPlanilha, errosDaApi, formatarErroPlanilha } from "./formatar-erro-planilha";


describe("mensagens de erro da planilha", () => {
  it("tem texto para cada código em en, pt e ko", () => {
    for (const idioma of ["en", "pt-BR", "ko"] as const) {
      const traducoes = resources[idioma].translation as Record<string, string>;
      for (const codigo of codigos) expect(traducoes[`spreadsheetError.${codigo}`], `${idioma} ${codigo}`).toBeTruthy();
    }
  });

  it("monta o texto no idioma da interface com coluna, valor e opções esperadas", async () => {
    const erro = { codigo: "valor_invalido" as const, linha: 2, coluna: "TC Situation", valor: "To-Do", parametros: { esperados: ["New", "New Step", "Without Changes"] } };

    await i18n.changeLanguage("pt-BR");
    expect(formatarErroPlanilha(i18n.t, erro)).toBe('Coluna TC Situation: "To-Do" não é válido. Use New, New Step ou Without Changes.');
    await i18n.changeLanguage("en");
    expect(formatarErroPlanilha(i18n.t, erro)).toBe('TC Situation column: "To-Do" isn\'t valid. Use New, New Step, or Without Changes.');
    expect(formatarErroPlanilha(i18n.t, { codigo: "tc_id_duplicado", linha: 5, coluna: "TC ID", valor: "Clock_001", parametros: { primeira_linha: 2 } }))
      .toBe('TC ID column: "Clock_001" already appears in row 2.');
  });

  it("cita a coluna e o limite formatado quando o texto passa do máximo", async () => {
    const erro = { codigo: "texto_muito_longo" as const, linha: 4, coluna: "Test Procedure(English)", valor: "a".repeat(40) + "…", parametros: { maximo: 10_000 } };

    await i18n.changeLanguage("pt-BR");
    expect(formatarErroPlanilha(i18n.t, erro)).toBe("Coluna Test Procedure(English): o texto passa de 10.000 caracteres. Encurte o texto.");
    await i18n.changeLanguage("en");
    expect(formatarErroPlanilha(i18n.t, erro)).toBe("Test Procedure(English) column: the text is longer than 10,000 characters. Shorten it.");
  });

  it("converte o 422 da API e usa a mensagem do servidor quando o código é desconhecido", () => {
    const erros = errosDaApi({
      type: "about:blank", title: "Planilha inválida.", status: 422,
      errors: [
        { campo: "linha.3.assignees", mensagem: "x", codigo: "pessoa_fora_do_time", linha: 3, coluna: "Assignees", valor: "Rafael" },
        { campo: "time_id", mensagem: "Campo obrigatório." },
      ],
    });

    expect(erros).toEqual([
      { codigo: "pessoa_fora_do_time", linha: 3, coluna: "Assignees", valor: "Rafael", parametros: undefined },
      { codigo: null, mensagem: "time_id: Campo obrigatório.", linha: null, coluna: null, valor: null, parametros: undefined },
    ]);
    expect(formatarErroPlanilha(i18n.t, erros[1])).toBe("time_id: Campo obrigatório.");
  });

  it("separa problemas gerais e agrupa os demais por linha em ordem", () => {
    const { gerais, linhas } = agruparErrosPlanilha([
      { codigo: "valor_obrigatorio", linha: 5, coluna: "Backup", valor: null },
      { codigo: "app_ausente", linha: null, coluna: "App", valor: null },
      { codigo: "valor_invalido", linha: 2, coluna: "Category", valor: "D" },
      { codigo: "valor_obrigatorio", linha: 5, coluna: "Category", valor: null },
    ]);

    expect(gerais.map((erro) => erro.codigo)).toEqual(["app_ausente"]);
    expect(linhas.map(({ linha, erros }) => [linha, erros.map((erro) => erro.coluna)])).toEqual([[2, ["Category"]], [5, ["Backup", "Category"]]]);
  });
});
