import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { Sidebar } from "./Sidebar";

const perfil: PerfilAtual = {
  id: "developer", nome: "Developer", email: "dev@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: null, perfil: "Developer", permissoes: [], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
};

function renderSidebar(currentProfile: PerfilAtual) {
  return render(<MemoryRouter><Sidebar perfil={currentProfile} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);
}

describe("Sidebar project navigation", () => {
  it("mostra Projects para dev sem depender de projetos ou TCs associados", () => {
    renderSidebar({ ...perfil, perfil_codigo: "USUARIO_PADRAO", permissoes: ["test_cases.consultar"] });
    expect(screen.getByRole("link", { name: "Projects" })).toHaveAttribute("href", "/projetos");
  });
  it("mostra General Results para admin, gerente e KP com permissão Form Factor", () => {
    for (const perfilCodigo of ["ADMIN_UNIDADE", "GERENTE", "KP"] as const) {
      const { unmount } = renderSidebar({ ...perfil, perfil_codigo: perfilCodigo, permissoes: ["form_factor.consultar"] });
      expect(screen.getByRole("link", { name: "General Results" })).toHaveAttribute("href", "/resultados-gerais");
      unmount();
    }
    for (const current of [
      { perfil_codigo: "USUARIO_PADRAO", permissoes: ["form_factor.consultar"] },
      { perfil_codigo: "KP", permissoes: [] },
    ]) {
      const { unmount } = renderSidebar({ ...perfil, ...current });
      expect(screen.queryByRole("link", { name: "General Results" })).not.toBeInTheDocument();
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
    unmount();

    const { unmount: unmountAdmin } = renderSidebar({ ...perfil, perfil_codigo: "ADMIN_UNIDADE", permissoes: [] });
    await user.click(screen.getByRole("button", { name: "Administration" }));
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Device models" })).not.toBeInTheDocument();
    unmountAdmin();

    renderSidebar({ ...perfil, perfil_codigo: "ADMIN_UNIDADE", permissoes: ["modelos_dispositivo.gerenciar"] });
    await user.click(screen.getByRole("button", { name: "Administration" }));
    expect(screen.getByRole("link", { name: "Device models" })).toBeInTheDocument();
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
