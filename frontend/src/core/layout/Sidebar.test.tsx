import { render, screen } from "@testing-library/react";
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
  it("shows My Projects only when the profile can consult projects", () => {
    const { rerender } = renderSidebar(perfil);
    expect(screen.queryByRole("link", { name: "My Projects" })).not.toBeInTheDocument();

    rerender(<MemoryRouter><Sidebar perfil={{ ...perfil, permissoes: ["projetos.consultar"] }} recolhida={false} onToggle={() => undefined} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "My Projects" })).toHaveAttribute("href", "/projetos");
  });
});
