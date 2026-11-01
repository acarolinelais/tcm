import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "@/core/i18n";

import type { RegistroAuditoria } from "../model/auditoria";
import { DetalheAuditoriaDrawer } from "./DetalheAuditoriaDrawer";

const criacao: RegistroAuditoria = {
  id: 2, alterado_em: "2026-10-28T12:00:00Z", usuario_nome: null, usuario_perfil: null, acao: "criacao",
  caso_teste_id: "caso-2", tc_id: "Clock_002", projeto_id: "projeto-1", projeto_nome: "Clock 9.5",
  alteracoes: [{ campo: "criacao", valor_anterior: null, valor_novo: null }], origem: "form_factor", tela: null,
};

describe("DetalheAuditoriaDrawer", () => {
  beforeEach(async () => { await i18n.changeLanguage("en"); });

  it("mostra a criação, a origem e o atalho para o Test Case", () => {
    render(<MemoryRouter><DetalheAuditoriaDrawer registro={criacao} onFechar={() => undefined} /></MemoryRouter>);

    const painel = screen.getByRole("dialog");
    expect(within(painel).getByText("Test Case created")).toBeInTheDocument();
    expect(within(painel).getByText("Form Factor")).toBeInTheDocument();
    expect(within(painel).getByText("Clock_002 · Clock 9.5")).toBeInTheDocument();
  });

  it("falha: registro sem autor nem tela mostra travessão, nunca vazio", () => {
    render(<MemoryRouter><DetalheAuditoriaDrawer registro={criacao} onFechar={() => undefined} /></MemoryRouter>);

    // Usuário, perfil e tela.
    expect(within(screen.getByRole("dialog")).getAllByText("—")).toHaveLength(3);
  });

  it("falha: origem que a tela não conhece aparece como veio, nunca vazia", () => {
    render(<MemoryRouter><DetalheAuditoriaDrawer registro={{ ...criacao, origem: "planilha" }} onFechar={() => undefined} /></MemoryRouter>);

    expect(within(screen.getByRole("dialog")).getByText("planilha")).toBeInTheDocument();
  });
});
