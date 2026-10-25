import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";
import { Navbar } from "./Navbar";

const perfil = {
  id: "u", nome: "Caroline Souza", email: "c@example.com", unidade_id: "un", unidade_nome: "Un", perfil_codigo: "ADMIN_UNIDADE",
  perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en",
} as PerfilAtual;

// MemoryRouter comum: a navegação do roteador de dados quebra no jsdom (AbortSignal incompatível).
function renderEm(caminho: string) {
  const local = { pathname: caminho };
  function Espiao() {
    local.pathname = useLocation().pathname;
    return null;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[caminho]}>
        <Navbar perfil={perfil} />
        <Espiao />
        <Routes>
          <Route path="/overview" element={<Link to="/projetos">ir para projetos</Link>} />
          <Route path="/projetos" element={<Link to="/projetos/p1">abrir projeto</Link>} />
          <Route path="/projetos/:id" element={<p>detalhe</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return local;
}

describe("botão de voltar da navbar", () => {
  it("no detalhe de um projeto, mostra a página principal e volta para ela", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    const local = renderEm("/projetos/21ba446b");

    const voltar = screen.getByRole("button", { name: "Back to My Projects" });
    expect(voltar).toHaveTextContent("My Projects");
    await user.click(voltar);
    await waitFor(() => expect(local.pathname).toBe("/projetos"));
  });

  it("não aparece nas páginas da sidebar", async () => {
    await i18n.changeLanguage("en");
    renderEm("/projetos");

    expect(screen.queryByRole("button", { name: /^Back/ })).not.toBeInTheDocument();
  });
});
