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

  it("no claro, só entram a borda #f2f2f2 e o corpo da tabela igual ao cartão", () => {
    const claro = tokens(":root");
    expect(claro.edge).toBe("#f2f2f2");
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

// Spec 055: o redesign muda só o claro (RN-10); a paleta escura nova é uma spec à parte. Se este hash falhar, o escuro mudou.
const HASH_DO_ESCURO = "929e2c46";

/** FNV-1a de 32 bits: basta para notar uma edição acidental do bloco, e não pede tipos do Node. */
function hash(texto: string) {
  let h = 0x811c9dc5;
  for (const c of texto) h = Math.imul(h ^ c.codePointAt(0)!, 0x01000193);
  return (h >>> 0).toString(16);
}

/** "209 100% 41%" (tripla do shadcn) em RGB, para comparar com o acento. */
function hslParaRgb(tripla: string): number[] {
  const [h, s, l] = tripla.match(/[\d.]+/g)!.map(Number);
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const canal = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return [canal(0), canal(8), canal(4)];
}

describe("tema claro do redesign (spec 055)", () => {
  it("o acento e o texto de acento passam de 4,5:1 sobre o branco, o painel e o fundo do item ativo", () => {
    const claro = tokens(":root");
    const falhas = [
      ...["#ffffff", valor(claro, "panel"), valor(claro, "accent-tint")].map((fundo): [string, string] => [valor(claro, "accent-text"), fundo]),
      ["#ffffff", valor(claro, "accent")] as [string, string], // texto branco sobre o botão e o preenchimento de acento
    ].flatMap(([texto, fundo]) => {
      const medida = contraste(texto, fundo);
      return medida < 4.5 ? [`${texto} sobre ${fundo}: ${medida.toFixed(2)}`] : [];
    });
    expect(falhas).toEqual([]);
  });

  it("o acento é o azul do Figma (#0081F9) escurecido, e o item ativo usa o fundo #e6f3ff", () => {
    const claro = tokens(":root");
    expect([claro.accent, claro["accent-tint"]]).toEqual(["#006cd1", "#e6f3ff"]);
  });

  it("o --primary e o --ring do shadcn são o mesmo azul do --accent", () => {
    const claro = tokens(":root");
    const accent = [1, 3, 5].map((k) => parseInt(claro.accent.slice(k, k + 2), 16));
    for (const nome of ["primary", "ring"]) {
      hslParaRgb(claro[nome]).forEach((canal, k) => expect(Math.abs(canal - accent[k]), `--${nome}`).toBeLessThanOrEqual(1));
    }
  });

  it("os tokens do tema escuro não mudaram", () => {
    // Lê as declarações, e não o texto: editar um comentário ou o espaçamento não quebra o teste. Os `--auth-*` do
    // login (ajuste de 2026-11-03) têm teste próprio, abaixo, e ficam fora deste hash.
    const escuroSemLogin = Object.fromEntries(Object.entries(tokens(":root.dark")).filter(([nome]) => !nome.startsWith("auth-")));
    expect(hash(JSON.stringify([escuroSemLogin, blocoDoContraste(":root.dark")]))).toBe(HASH_DO_ESCURO);
  });
});

describe("cores do login e da troca de senha (ajuste de 2026-11-03)", () => {
  const claro = tokens(":root");
  const escuro = { ...claro, ...tokens(":root.dark") };

  it("usam os valores da lista do protótipo, no claro e no escuro", () => {
    const esperado = (m: Tokens) => ["titulo", "subtitulo", "texto", "controle", "card", "borda", "campo", "campo-borda", "icone", "pagina", "botao", "botao-hover", "botao-texto"].map((nome) => valor(m, `auth-${nome}`));
    expect(esperado(claro)).toEqual(["#0081f9", "#7e7e7e", "#454442", "#454442", "#ffffff", "#f2f2f2", "#ffffff", "#f2f2f2", "#7e7e7e", "#fbfbfb", "#0081f9", "#006cd1", "#ffffff"]);
    expect(esperado(escuro)).toEqual(["#0c8aff", "#b5b5b5", "#ffffff", "#b5b5b5", "#0f0f0f", "#1b1b1b", "#1b1b1b", "#262626", "#b5b5b5", "#000000", "#0c8aff", "#0a72d1", "#ffffff"]);
  });

  // [texto, fundo, mínimo, motivo]. Os mínimos abaixo de 4,5 são os valores que o protótipo fixa, e não um descuido:
  // o título é texto grande (25px, mínimo 3:1), e o subtítulo claro #7e7e7e mede 4,05:1 sobre o branco.
  const LIMITES: [string, string, number, string][] = [
    ["auth-texto", "auth-card", 4.5, "texto principal"],
    ["auth-texto", "auth-campo", 4.5, "texto digitado"],
    ["auth-controle", "auth-card", 4.5, "botão de idioma e ícone do tema"],
    ["auth-subtitulo", "auth-card", 4, "subtítulo (claro: 4,05:1, abaixo do AA por decisão do protótipo)"],
    ["auth-titulo", "auth-card", 3, "título grande (claro: 3,8:1)"],
    ["auth-icone", "auth-campo", 3, "olho da senha, componente de interface"],
    ["auth-botao-texto", "auth-botao", 3.4, "texto branco do botão (claro: 3,8:1; escuro: 3,45:1, abaixo do AA por decisão do protótipo)"],
    ["auth-botao-texto", "auth-botao-hover", 4.5, "texto do botão com o mouse em cima"],
  ];

  it.each([["claro", claro], ["escuro", escuro]] as [string, Tokens][])("cada par de texto passa do mínimo dele no tema %s", (_, mapa) => {
    const falhas = LIMITES.flatMap(([texto, fundo, minimo, motivo]) => {
      const medida = contraste(valor(mapa, texto), valor(mapa, fundo));
      return medida < minimo ? [`${motivo}: ${valor(mapa, texto)} sobre ${valor(mapa, fundo)} = ${medida.toFixed(2)} (mínimo ${minimo})`] : [];
    });
    expect(falhas).toEqual([]);
  });

  it("no escuro, o título e o subtítulo passam do AA sobre o card #0f0f0f", () => {
    for (const nome of ["auth-titulo", "auth-subtitulo"]) {
      expect(contraste(valor(escuro, nome), valor(escuro, "auth-card")), nome).toBeGreaterThanOrEqual(4.5);
    }
  });
});

