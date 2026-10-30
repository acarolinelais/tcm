import { describe, expect, it } from "vitest";

import css from "@/core/global.css?raw";

// Spec 050 (RN-03 a RN-05): o texto e as etiquetas do escuro passam de 4,5:1 sobre os fundos do protótipo, e o
// claro só ganha os tokens novos. Os valores saem do próprio global.css, então o teste acompanha qualquer ajuste.

type Tokens = Record<string, string>;

/** Blocos `:root` e `:root.dark` do nível de cima; os de `@media` ficam de fora e são lidos por `blocoDoContraste`. */
function tokens(seletor: ":root" | ":root.dark"): Tokens {
  const blocos = [...css.matchAll(/^(:root(?:\.dark)?) \{([^}]*)\}/gm)].filter(([, sel]) => sel === seletor);
  return Object.fromEntries(blocos.flatMap(([, , corpo]) => [...corpo.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, nome, valor]) => [nome, valor.trim()])));
}

/** Resolve `var(--x)` até chegar numa cor. */
function valor(mapa: Tokens, nome: string): string {
  const bruto = mapa[nome];
  if (!bruto) throw new Error(`--${nome}: token ausente`);
  const referencia = /^var\(--([\w-]+)\)$/.exec(bruto);
  return referencia ? valor(mapa, referencia[1]) : bruto;
}

type Rgba = [number, number, number, number];

function rgba(cor: string): Rgba {
  const hex = /^#([0-9a-f]{6})$/i.exec(cor);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as Rgba;
  const rgb = /^rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)$/.exec(cor);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] ? Number(rgb[4]) : 1];
  throw new Error(`cor não suportada no teste: ${cor}`);
}

function luminancia([r, g, b]: Rgba) {
  const [rl, gl, bl] = [r, g, b].map((c) => c / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

/** Contraste do WCAG; um texto translúcido é composto sobre o fundo antes da medida. */
function contraste(texto: string, fundo: string) {
  const [fr, fg, fb] = rgba(fundo);
  const [tr, tg, tb, ta] = rgba(texto);
  const composto: Rgba = [tr * ta + fr * (1 - ta), tg * ta + fg * (1 - ta), tb * ta + fb * (1 - ta), 1];
  const [maior, menor] = [luminancia(composto), luminancia([fr, fg, fb, 1])].sort((x, y) => y - x);
  return (maior + 0.05) / (menor + 0.05);
}

const FUNDOS = ["background", "surface", "panel", "table-body"];
const PARES: [string, string][] = [
  ...["foreground", "body", "muted", "subtle"].flatMap((texto) => FUNDOS.map((fundo): [string, string] => [texto, fundo])),
  ...["surface", "panel", "table-body"].map((fundo): [string, string] => ["accent-text", fundo]),
  ["accent-soft-foreground", "accent-tint"],
  ["etiqueta-todo-fg", "etiqueta-todo-bg"],
  ["etiqueta-neutro-fg", "etiqueta-neutro-bg"],
];

/** Declarações de `:root` e de `:root.dark` dentro do `@media (prefers-contrast: more)`. */
function blocoDoContraste(seletor: ":root" | ":root.dark"): Tokens {
  const media = /@media \(prefers-contrast: more\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const bloco = media.split(/\n {2}(?=:root)/).find((trecho) => trecho.startsWith(`${seletor} {`)) ?? "";
  return Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, nome, valor]) => [nome, valor.trim()]));
}

describe("contraste do tema escuro (spec 050)", () => {
  it("todo texto e etiqueta do escuro passam de 4,5:1 sobre o seu fundo", () => {
    const escuro = { ...tokens(":root"), ...tokens(":root.dark") };
    const falhas = PARES.flatMap(([texto, fundo]) => {
      const medida = contraste(valor(escuro, texto), valor(escuro, fundo));
      return medida < 4.5 ? [`--${texto} sobre --${fundo}: ${medida.toFixed(2)}`] : [];
    });
    expect(falhas).toEqual([]);
  });

  it("os fundos do escuro são os do protótipo e a borda é #2f2f2f", () => {
    const escuro = { ...tokens(":root"), ...tokens(":root.dark") };
    expect(["background", "surface", "panel", "table-body", "edge"].map((nome) => valor(escuro, nome)))
      .toEqual(["#0a0a0a", "#1b1b1b", "#232325", "#161616", "#2f2f2f"]);
  });

  it("no claro, só entram a borda #eeeeee e o corpo da tabela igual ao cartão", () => {
    const claro = tokens(":root");
    expect(claro.edge).toBe("#eeeeee");
    expect(claro["table-body"]).toBe("var(--surface)");
    expect([claro.page, claro.panel, claro.body, claro["etiqueta-todo-bg"], claro["etiqueta-neutro-bg"]])
      .toEqual(["#fbfbfb", "#f3f5f7", "#454442", "#edfaff", "#edeff1"]);
  });

  it("com contraste aumentado, a borda dos cartões e controles passa de 3:1 nos dois temas", () => {
    const claro = blocoDoContraste(":root");
    const escuro = { ...tokens(":root"), ...tokens(":root.dark"), ...blocoDoContraste(":root.dark") };

    expect(claro.edge).toBe("#8e8e93");
    expect(contraste(claro.edge, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(escuro.edge).toBe("var(--border)");
    expect(contraste(valor(escuro, "edge"), valor(escuro, "surface"))).toBeGreaterThanOrEqual(3);
  });

  it("aponta um par abaixo de 4,5:1, inclusive com texto translúcido", () => {
    expect(contraste("#777777", "#5a5a5a")).toBeLessThan(4.5);
    expect(contraste("rgb(255 255 255 / 0.2)", "#0a0a0a")).toBeLessThan(4.5);
    expect(contraste("#ffffff", "#000000")).toBeCloseTo(21);
  });
});
