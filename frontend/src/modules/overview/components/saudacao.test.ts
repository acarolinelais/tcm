import { describe, expect, it } from "vitest";

import { resources } from "@/core/i18n/resources";
import { etapaDe, periodoDe, sortear, VARIANTES } from "./saudacao";

describe("periodoDe", () => {
  it.each([[0, "noite"], [4, "noite"], [5, "manha"], [11, "manha"], [12, "tarde"], [17, "tarde"], [18, "noite"], [23, "noite"]] as const)("às %ih é %s", (hora, periodo) => {
    expect(periodoDe(hora)).toBe(periodo);
  });
});

describe("etapaDe", () => {
  it.each([
    [0, 0, "semCasos"],
    [5, 5, "concluido"],
    [5, 4, "ultimo"],
    [1, 0, "ultimo"], // com 1 faltando, vale o texto no singular, mesmo sem ter começado
    [6, 0, "naoComecou"],
    [10, 4, "comecando"],
    [10, 5, "metade"],
    [10, 7, "metade"],
    [10, 8, "quaseLa"],
    [10, 9, "ultimo"],
  ] as const)("%i casos, %i concluídos: %s", (total, concluidos, etapa) => {
    expect(etapaDe(total, concluidos)).toBe(etapa);
  });

  it("nunca devolve uma etapa de plural com 1 faltando", () => {
    for (let total = 1; total <= 30; total++) {
      expect(etapaDe(total, total - 1)).toBe("ultimo");
    }
  });
});

describe("sortear", () => {
  it("cobre a lista toda e nunca passa do último", () => {
    expect(sortear(["a", "b", "c"], 0)).toBe("a");
    expect(sortear(["a", "b", "c"], 0.5)).toBe("b");
    expect(sortear(["a", "b", "c"], 0.999)).toBe("c");
    expect(sortear(["a", "b", "c"], 1)).toBe("c");
  });
});

describe("frases da saudação", () => {
  const grupos = ["manha", "tarde", "noite", "semCasos", "naoComecou", "comecando", "metade", "quaseLa", "ultimo", "concluido"];

  it.each(["en", "pt-BR", "ko"] as const)("%s tem todas as frases de título e de subtítulo", (idioma) => {
    const textos = resources[idioma].translation as Record<string, string>;
    for (const grupo of grupos) {
      for (let i = 1; i <= VARIANTES; i++) {
        expect(textos[`overviewTitulo_${grupo}_${i}`], `${idioma} título ${grupo} ${i}`).toBeTruthy();
      }
    }
    for (const etapa of grupos.slice(3)) {
      for (let i = 1; i <= VARIANTES; i++) expect(textos[`overviewSubtitulo_${etapa}_${i}`], `${idioma} subtítulo ${etapa} ${i}`).toBeTruthy();
    }
  });

  it("os títulos levam o nome, e só a primeira frase de cada etapa de contagem leva o número", () => {
    for (const idioma of ["en", "pt-BR", "ko"] as const) {
      const textos = resources[idioma].translation as Record<string, string>;
      for (const grupo of grupos) {
        for (let i = 1; i <= VARIANTES; i++) expect(textos[`overviewTitulo_${grupo}_${i}`], `${idioma} ${grupo} ${i}`).toContain("{{name}}");
      }
      for (const etapa of ["comecando", "metade", "quaseLa"]) {
        expect(textos[`overviewSubtitulo_${etapa}_1`], `${idioma} ${etapa} 1`).toContain("{{count}}");
        expect(textos[`overviewSubtitulo_${etapa}_2`], `${idioma} ${etapa} 2`).not.toContain("{{count}}");
      }
    }
  });
});
