import { describe, expect, it } from "vitest";

import { createModeloDispositivoFormSchema, DESCRICAO_MAX_LENGTH, NOME_MAX_LENGTH } from "./modelo-dispositivo";

const schema = createModeloDispositivoFormSchema((key) => key);

describe("createModeloDispositivoFormSchema", () => {
  it("aceita nome com descrição opcional e remove espaços nas pontas", () => {
    expect(schema.parse({ nome: " S27 Ultra ", descricao: "" })).toEqual({ nome: "S27 Ultra", descricao: "" });
  });

  it.each([
    [{ nome: "   ", descricao: "" }, "requiredField"],
    [{ nome: "x".repeat(NOME_MAX_LENGTH + 1), descricao: "" }, "deviceModelNameMax"],
    [{ nome: "S27", descricao: "x".repeat(DESCRICAO_MAX_LENGTH + 1) }, "deviceModelDescriptionMax"],
  ])("recusa %o", (valores, mensagem) => {
    const resultado = schema.safeParse(valores);
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe(mensagem);
  });
});
