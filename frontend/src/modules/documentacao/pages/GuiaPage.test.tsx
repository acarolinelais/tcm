import { render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";

import type * as ModeloGuia from "../model/guia";
import { GuiaPage } from "./GuiaPage";

vi.mock("../model/guia", async (importOriginal) => ({
  ...(await importOriginal<typeof ModeloGuia>()),
  SLIDES: { en: ["import-spreadsheet"], "pt-BR": [], ko: [] },
}));
vi.mock("../conteudo/ko", () => ({
  ko: { "status-cycle": { titulo: "테스트 케이스 상태 주기", resumo: "각 상태의 의미", secoes: [{ titulo: "단계", itens: ["To Do"] }] } },
}));

function renderGuia(slug: string) {
  const router = createMemoryRouter(
    [{ path: "/documentation", element: <p>lista</p> }, { path: "/documentation/:slug", element: <GuiaPage /> }],
    { initialEntries: [`/documentation/${slug}`] },
  );
  return render(<RouterProvider router={router} />);
}

describe("GuiaPage", () => {
  it("abre o guia pelo endereço com o botão de baixar os slides", async () => {
    await i18n.changeLanguage("en");
    renderGuia("import-spreadsheet");
    expect(screen.getByRole("heading", { level: 1, name: "Import a project from a spreadsheet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Download slides (PDF)" })).toHaveAttribute("href", "/docs/en/import-spreadsheet.pdf");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("mostra o guia em coreano quando traduzido", async () => {
    await i18n.changeLanguage("ko");
    renderGuia("status-cycle");
    expect(screen.getByRole("heading", { level: 1, name: "테스트 케이스 상태 주기" })).toBeInTheDocument();
    expect(within(screen.getByRole("article")).getByRole("listitem")).toHaveTextContent("To Do");
    expect(screen.getByRole("navigation", { name: "이 페이지의 내용" })).toHaveTextContent("단계");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /슬라이드 다운로드/ })).not.toBeInTheDocument();
  });

  it("mostra o inglês com aviso quando o guia não tem tradução", async () => {
    await i18n.changeLanguage("ko");
    renderGuia("glossary");
    expect(screen.getByRole("heading", { level: 1, name: "Glossary" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("이 가이드는 아직 번역되지 않아");
  });

  it("mostra Guia não encontrado e o atalho para a lista num endereço inexistente", async () => {
    await i18n.changeLanguage("en");
    renderGuia("nao-existe");
    expect(screen.getByRole("heading", { level: 1, name: "Guide not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See all guides" })).toHaveAttribute("href", "/documentation");
  });
});

describe("GuiaPage, seções", () => {
  it("destaca o termo antes dos dois-pontos e numera as seções com âncora no índice", async () => {
    await i18n.changeLanguage("en");
    renderGuia("status-cycle");
    const fluxo = screen.getByRole("heading", { level: 2, name: /The expected flow/ }).closest("section")!;
    expect(within(fluxo).getAllByRole("listitem")[0].querySelector(".font-medium")).toHaveTextContent(/^To-Do$/);
    expect(within(screen.getByRole("navigation", { name: "On this page" })).getByRole("link", { name: "The expected flow" }))
      .toHaveAttribute("href", `#${fluxo.id}`);
    const automatico = screen.getByRole("heading", { level: 2, name: /When the system moves it for you/ }).closest("section")!;
    expect(automatico.querySelector("li .font-medium")).toBeNull();
  });

  it("avisa no botão quando os slides só existem em inglês", async () => {
    await i18n.changeLanguage("pt-BR");
    renderGuia("import-spreadsheet");
    expect(screen.getByRole("link", { name: "Baixar slides (PDF, em inglês)" })).toHaveAttribute("href", "/docs/en/import-spreadsheet.pdf");
  });
});
