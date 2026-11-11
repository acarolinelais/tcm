import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { Sidebar } from "./Sidebar";

const perfil: PerfilAtual = {
  id: "developer", nome: "Developer", email: "dev@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: null, perfil: "Developer", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
};

function renderSidebar(currentProfile: PerfilAtual) {
  return render(<MemoryRouter><Sidebar perfil={currentProfile} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);
}

describe("Sidebar project navigation", () => {
  it("mostra o logotipo com o nome, e só o símbolo quando recolhida (spec 055, CA-03 e CA-05)", () => {
    const { unmount } = renderSidebar(perfil);
    expect(screen.getByRole("img", { name: "Test Case Manager" }).parentElement).toHaveClass("max-w-[184px]");
    unmount();
    render(<MemoryRouter><Sidebar perfil={perfil} recolhida onToggle={() => undefined} /></MemoryRouter>);
    expect(screen.getByRole("img", { name: "Test Case Manager" }).parentElement).toHaveClass("max-w-[27px]");
  });

  it("mostra Projects para dev sem depender de projetos ou TCs associados", () => {
    renderSidebar({ ...perfil, perfil_codigo: "USUARIO_PADRAO", permissoes: ["test_cases.consultar"] });
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projetos");
  });
  it("mostra General Results para admin, gerente, KP e dev com permissão Form Factor (spec 059, CA-01)", () => {
    for (const perfilCodigo of ["ADMIN_UNIDADE", "GERENTE", "KP", "USUARIO_PADRAO"] as const) {
      const { unmount } = renderSidebar({ ...perfil, perfil_codigo: perfilCodigo, permissoes: ["form_factor.consultar"] });
      expect(screen.getByRole("link", { name: "General Results" })).toHaveAttribute("href", "/resultados-gerais");
      expect(screen.getByRole("link", { name: "SDF Failures" })).toHaveAttribute("href", "/bug-reports");
      unmount();
    }
    for (const current of [
      { perfil_codigo: "USUARIO_PADRAO", permissoes: ["test_cases.consultar"] },
      { perfil_codigo: "KP", permissoes: [] },
    ]) {
      const { unmount } = renderSidebar({ ...perfil, ...current });
      expect(screen.queryByRole("link", { name: "General Results" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "SDF Failures" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("mostra Teams para gerente que só participa de times e esconde sem setor nem participação", () => {
    const gerente = { ...perfil, perfil_codigo: "GERENTE", permissoes: ["times.consultar"] };
    const { rerender } = renderSidebar({ ...gerente, times: [{ id: "time-1", nome: "Produto" }] });
    expect(screen.getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/times");

    rerender(<MemoryRouter><Sidebar perfil={gerente} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Teams" })).not.toBeInTheDocument();
  });
  it("shows Projects only when the profile can consult projects", () => {
    const { rerender } = renderSidebar(perfil);
    expect(screen.queryByRole("link", { name: "Projects" })).not.toBeInTheDocument();

    rerender(<MemoryRouter><Sidebar perfil={{ ...perfil, permissoes: ["projetos.consultar"] }} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projetos");
  });

  it("mostra Device models dentro de Administration somente com permissão de catálogo", async () => {
    const user = userEvent.setup();
    const { unmount } = renderSidebar({ ...perfil, perfil_codigo: "KP", permissoes: ["modelos_dispositivo.gerenciar"] });
    await user.click(screen.getByRole("button", { name: "Administration" }));
    expect(screen.getByRole("link", { name: "Device models" })).toHaveAttribute("href", "/admin/modelos-dispositivo");
    expect(screen.queryByRole("link", { name: "Users" })).not.toBeInTheDocument();
    // Spec 052: Audit é só do admin, mesmo com Administration aberto para outro perfil.
    expect(screen.queryByRole("link", { name: "Audit" })).not.toBeInTheDocument();
    unmount();

    const { unmount: unmountAdmin } = renderSidebar({ ...perfil, perfil_codigo: "ADMIN_UNIDADE", permissoes: [] });
    await user.click(screen.getByRole("button", { name: "Administration" }));
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Device models" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit" })).toHaveAttribute("href", "/admin/auditoria");
    unmountAdmin();

    renderSidebar({ ...perfil, perfil_codigo: "ADMIN_UNIDADE", permissoes: ["modelos_dispositivo.gerenciar"] });
    await user.click(screen.getByRole("button", { name: "Administration" }));
    expect(screen.getByRole("link", { name: "Device models" })).toBeInTheDocument();
  });

  describe("KP com Teams e Users dentro de Administration (spec 074)", () => {
    const kp: PerfilAtual = { ...perfil, perfil_codigo: "KP", permissoes: ["times.consultar", "usuarios.consultar"], times: [{ id: "time-1", nome: "Produto" }] };
    const emRota = (rota: string, atual: PerfilAtual) => render(<MemoryRouter initialEntries={[rota]}><Sidebar perfil={atual} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);

    it("CA-03: Teams e Users ficam dentro de Administration, não soltos", async () => {
      const user = userEvent.setup();
      renderSidebar(kp);
      expect(screen.queryByRole("link", { name: "Teams" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Administration" }));
      expect(screen.getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/times");
      expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/usuarios");
    });

    it("CA-04: em Teams ou em Users, Administration abre com o item ativo", () => {
      for (const [rota, nome] of [["/times", "Teams"], ["/times/time-1", "Teams"], ["/usuarios", "Users"]] as const) {
        const { unmount } = emRota(rota, kp);
        expect(screen.getByRole("button", { name: "Administration" })).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByRole("link", { name: nome })).toHaveAttribute("aria-current", "page");
        unmount();
      }
    });

    it("CA-05 (falha): sem time não mostra Teams; sem permissão de usuários não mostra Users", () => {
      emRota("/times", { ...kp, times: [], permissoes: ["times.consultar"] });
      expect(screen.queryByRole("link", { name: "Teams", hidden: true })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Users", hidden: true })).not.toBeInTheDocument();
    });

    it("CA-06 (falha): sem nenhum item, Administration não aparece", () => {
      renderSidebar({ ...kp, permissoes: [], times: [] });
      expect(screen.queryByRole("button", { name: "Administration" })).not.toBeInTheDocument();
    });

    it("CA-07: o gerente continua com Teams e Users soltos", () => {
      renderSidebar({ ...kp, perfil_codigo: "GERENTE" });
      expect(screen.queryByRole("button", { name: "Administration" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Teams" })).toHaveAttribute("href", "/times");
      expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/usuarios");
    });
  });

  it("esconde Administration de gerente e dev sem a permissão do catálogo", () => {
    for (const outro of [{ perfil_codigo: "GERENTE", permissoes: ["projetos.gerenciar"] }, { perfil_codigo: "USUARIO_PADRAO", permissoes: ["projetos.consultar"] }]) {
      const { unmount } = renderSidebar({ ...perfil, ...outro });
      expect(screen.queryByRole("button", { name: "Administration" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Device models", hidden: true })).not.toBeInTheDocument();
      unmount();
    }
  });
});

describe("destaque dos itens (spec 050)", () => {
  const admin: PerfilAtual = { ...perfil, perfil_codigo: "ADMIN_UNIDADE", permissoes: ["projetos.consultar", "test_cases.consultar", "usuarios.consultar", "modelos_dispositivo.consultar"] };

  function renderEm(caminho: string, recolhida: boolean) {
    return render(<MemoryRouter initialEntries={[caminho]}><Sidebar perfil={admin} recolhida={recolhida} onToggle={() => undefined} /></MemoryRouter>);
  }

  function itens() {
    const lateral = within(screen.getByRole("complementary"));
    return [...lateral.getAllByRole("link"), lateral.getByRole("button", { name: "Administration" })];
  }

  it("com a Sidebar aberta, todos os itens usam a pílula, no ativo e no hover, com o anel de foco no mesmo raio", async () => {
    renderEm("/overview", false);
    await userEvent.click(screen.getByRole("button", { name: "Administration" }));

    expect(itens().length).toBeGreaterThan(5);
    for (const item of itens()) {
      expect(item, item.textContent ?? "").toHaveClass("rounded-full", "focus-visible:ring-2");
      expect(item.className).not.toMatch(/rounded-lg/);
    }
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveClass("bg-accent-tint");
    expect(screen.getByRole("link", { name: "Projects" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Projects" })).toHaveClass("hover:bg-secondary");
  });

  it("com a Sidebar recolhida, o destaque é um círculo de 30px centralizado no ícone (falha se voltar ao retângulo)", () => {
    renderEm("/overview", true);
    const ativo = screen.getByRole("link", { name: "Overview" });

    expect(ativo).toHaveClass("size-[30px]", "mx-auto", "justify-center", "rounded-full", "bg-accent-tint");
    expect(ativo).not.toHaveClass("w-full");
    expect(ativo).not.toHaveClass("px-4");
  });
});
