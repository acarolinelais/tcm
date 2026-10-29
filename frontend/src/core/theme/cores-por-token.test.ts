import { describe, expect, it } from "vitest";

// ADR 0040: cor no código só por token com valor nos dois temas. Este teste acha as cores fixas que escapam.
const paleta = "white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const padroes = [
  /\[#[0-9a-fA-F]{3,8}\]/, // classe arbitrária com hex: text-[#454442]
  new RegExp(`\\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|outline|placeholder|shadow|decoration|caret)-(?:${paleta})(?:-\\d{2,3})?\\b`), // paleta crua: bg-white, text-slate-700
  /["'`]#[0-9a-fA-F]{3,8}["'`]/, // hex em string: style, props de SVG, tokens sobrescritos
  /\b(?:rgba?|hsla?|oklch|oklab)\(/, // cor literal em função: rgb(), hsl(), oklch()
  /\b(?:fill|stroke|stopColor|color|backgroundColor)=?[:=]?\s*\{?["'`](?:white|black)["'`]/, // cor nomeada em SVG ou style
];

// Exceções pontuais, com o motivo. Comentários também ficam de fora (citam o hex do Figma como referência).
const excecoes: Record<string, string> = {
  "/src/modules/projetos/components/importacao/icones-importacao.tsx": "logo do Excel nas cores da marca",
};
const comentario = /^\s*(\/\/|\/?\*)/;

export function coresFixas(arquivo: string, codigo: string) {
  if (excecoes[arquivo]) return [];
  return codigo.split("\n").flatMap((linha, i) => !comentario.test(linha) && padroes.some((padrao) => padrao.test(linha)) ? [`${arquivo}:${i + 1}: ${linha.trim()}`] : []);
}

const fontes = import.meta.glob(["/src/**/*.{ts,tsx}", "!/src/**/*.test.{ts,tsx}"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

describe("cores por token (ADR 0040)", () => {
  it("nenhum arquivo de src/ usa cor fixa", () => {
    const achados = Object.entries(fontes).flatMap(([arquivo, codigo]) => coresFixas(arquivo, codigo));
    expect(achados).toEqual([]);
  });

  it("detecta hex, paleta crua e rgb, apontando arquivo e linha", () => {
    const codigo = 'const ok = "text-body";\n<span className="text-[#454442] bg-white" />\nstyle={{ color: "#fff", boxShadow: "0 0 1px rgba(0,0,0,.1)" }}\n// referência do Figma: "#454442"\n<circle fill="white" />\nclassName="bg-[hsl(0_0%_100%)]"';
    expect(coresFixas("/src/x.tsx", codigo)).toEqual([
      '/src/x.tsx:2: <span className="text-[#454442] bg-white" />',
      '/src/x.tsx:3: style={{ color: "#fff", boxShadow: "0 0 1px rgba(0,0,0,.1)" }}',
      '/src/x.tsx:5: <circle fill="white" />',
      '/src/x.tsx:6: className="bg-[hsl(0_0%_100%)]"',
    ]);
  });
});
