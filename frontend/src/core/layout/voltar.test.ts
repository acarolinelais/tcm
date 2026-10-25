import { describe, expect, it } from "vitest";

import { rotaPai, rotuloDaRota } from "./voltar";

describe("botão de voltar", () => {
  it("dá nome às telas pelo caminho", () => {
    expect(rotuloDaRota("/projetos")).toBe("myProjects");
    expect(rotuloDaRota("/projetos/abc")).toBe("project");
    expect(rotuloDaRota("/admin/times/abc")).toBe("team");
    expect(rotuloDaRota("/rota-desconhecida")).toBe("overview");
  });

  it("só volta de páginas fora da sidebar, sempre para a página principal delas", () => {
    expect(rotaPai("/projetos/21ba446b-11ed-4a37-b83b-b4153a004ec5")).toBe("/projetos");
    expect(rotaPai("/modelos-dispositivo")).toBe("/projetos");
    expect(rotaPai("/times/t1")).toBe("/times");
    expect(rotaPai("/admin/times/t1")).toBe("/admin/times");
    for (const principal of ["/overview", "/projetos", "/admin/usuarios", "/admin/times", "/configuracoes", "/documentation"]) {
      expect(rotaPai(principal)).toBeNull();
    }
  });
});
