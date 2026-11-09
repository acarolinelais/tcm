import { describe, expect, it, vi } from "vitest";

import type * as ModeloGuia from "../model/guia";
import { destaquesDoPerfil, guiaPorSlug, guiasNoIdioma, urlSlides } from "./guias";

vi.mock("../model/guia", async (importOriginal) => ({
  ...(await importOriginal<typeof ModeloGuia>()),
  SLIDES: { en: ["status-cycle", "audit"], "pt-BR": ["audit"], ko: [] },
}));
vi.mock("./ko", () => ({ ko: { audit: { titulo: "감사", resumo: "누가 무엇을 바꿨는지", secoes: [] } } }));

describe("guias", () => {
  it("lista os 12 guias na ordem da spec, começando por Primeiros passos", () => {
    const guias = guiasNoIdioma("en");
    expect(guias).toHaveLength(12);
    expect(guias[0]).toMatchObject({ slug: "getting-started", titulo: "Getting started", traduzido: true });
  });

  it("tem texto em inglês em todos os guias", () => {
    expect(guiasNoIdioma("en").filter(({ secoes }) => secoes.length === 0).map(({ slug }) => slug)).toEqual([]);
  });

  it("usa a tradução quando existe e cai no inglês com aviso quando não", () => {
    expect(guiaPorSlug("audit", "ko")).toMatchObject({ titulo: "감사", traduzido: true });
    expect(guiaPorSlug("glossary", "ko")).toMatchObject({ titulo: "Glossary", traduzido: false });
    expect(guiaPorSlug("glossary", "fr")).toMatchObject({ titulo: "Glossary", traduzido: true });
  });

  it("não encontra um slug que não é guia", () => {
    expect(guiaPorSlug("nao-existe", "en")).toBeUndefined();
    expect(guiaPorSlug("toString", "en")).toBeUndefined();
  });

  it("destaca os guias do perfil e nenhum para perfil desconhecido", () => {
    expect(destaquesDoPerfil("USUARIO_PADRAO", "en").map(({ slug }) => slug)).toEqual(["status-cycle", "status-and-situation"]);
    expect(destaquesDoPerfil("OUTRO", "en")).toEqual([]);
    expect(destaquesDoPerfil(null, "en")).toEqual([]);
    expect(destaquesDoPerfil("toString", "en")).toEqual([]);
  });

  it("aponta o PDF do idioma, cai no inglês e devolve null sem slides", () => {
    expect(urlSlides("audit", "pt-BR")).toBe("/docs/pt-BR/audit.pdf");
    expect(urlSlides("status-cycle", "pt-BR")).toBe("/docs/en/status-cycle.pdf");
    expect(urlSlides("glossary", "en")).toBeNull();
  });

  it("tem no public/docs o PDF de cada slide declarado", async () => {
    const { SLIDES } = await vi.importActual<typeof ModeloGuia>("../model/guia");
    const pdfs = Object.keys(import.meta.glob("/public/docs/*/*.pdf"));
    const faltando = Object.entries(SLIDES).flatMap(([idioma, slugs]) =>
      slugs.map((slug) => `/public/docs/${idioma}/${slug}.pdf`).filter((arquivo) => !pdfs.includes(arquivo)));
    expect(faltando).toEqual([]);
  });
});
