import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageTitle } from "./page-card";

// Spec 055, RN-09: o título de toda página usa a cor de acento. Este teste acha os <h1> que escapam do PageTitle.
const fontes = import.meta.glob(["/src/**/*.tsx", "!/src/**/*.test.tsx"], { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const comentario = /^\s*(\/\/|\/?\*)/;

function h1SemAcento(arquivo: string, codigo: string) {
  return codigo.split("\n").flatMap((linha, i) => linha.includes("<h1") && !comentario.test(linha) && !linha.includes("text-accent-text") ? [`${arquivo}:${i + 1}: ${linha.trim()}`] : []);
}

describe("PageTitle", () => {
  it("é um h1 na cor de acento", () => {
    render(<PageTitle>Projects</PageTitle>);
    expect(screen.getByRole("heading", { level: 1, name: "Projects" })).toHaveClass("text-accent-text");
  });

  it("nenhum <h1> de src/ fica fora da cor de acento", () => {
    const achados = Object.entries(fontes).flatMap(([arquivo, codigo]) => h1SemAcento(arquivo, codigo));
    expect(achados).toEqual([]);
  });

  it("detecta um <h1> sem a cor de acento na própria linha, apontando arquivo e linha, e ignora comentários", () => {
    expect(h1SemAcento("/src/x.tsx", 'ok\n<h1 className="text-accent-text">A</h1>\n<h1 className="text-foreground">B</h1>\n// <h1 className="x">\n<h1 className="m">\n  <i className="text-accent-text" />')).toEqual([
      '/src/x.tsx:3: <h1 className="text-foreground">B</h1>',
      '/src/x.tsx:5: <h1 className="m">',
    ]);
  });
});
