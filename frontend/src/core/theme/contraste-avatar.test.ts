import { describe, expect, it } from "vitest";

import css from "@/core/global.css?raw";

// CA-10 da spec 036: cada cor do avatar se destaca do fundo (≥ 3:1, contraste de elemento gráfico do WCAG).
// Fundos onde o avatar aparece: no claro, o cartão (branco) e a página; no escuro, o cartão e a página.
const FUNDOS = { claro: ["#ffffff", "#fbfbfb"], escuro: ["#1e1e1e", "#323232"] };

function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [maior, menor] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

function tokensDoAvatar(seletor: ":root" | ":root.dark") {
  const blocos = [...css.matchAll(/(:root(?:\.dark)?) \{([^}]*)\}/g)].filter(([, sel, corpo]) => sel === seletor && corpo.includes("--avatar-1:"));
  return Object.fromEntries([...blocos[0][2].matchAll(/--(avatar-\d): (#[0-9a-f]{6})/g)].map(([, nome, valor]) => [nome, valor]));
}

describe("contraste da paleta do avatar (ADR 0043)", () => {
  it.each([["claro", ":root"], ["escuro", ":root.dark"]] as const)("tema %s: as 8 cores se destacam do fundo", (tema, seletor) => {
    const tokens = tokensDoAvatar(seletor);
    const falhas = Array.from({ length: 8 }, (_, i) => i + 1).flatMap((n) => {
      const cor = tokens[`avatar-${n}`];
      if (!cor) return [`--avatar-${n}: token ausente`];
      return FUNDOS[tema].filter((fundo) => contraste(cor, fundo) < 3).map((fundo) => `--avatar-${n} sobre ${fundo}`);
    });
    expect(falhas).toEqual([]);
  });

  it("aponta um par sem contraste", () => {
    expect(contraste("#ffffff", "#fde047")).toBeLessThan(3);
    expect(contraste("#ffffff", "#000000")).toBeCloseTo(21);
  });
});
