import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
function renderEm(caminho: string, perfilAtual: PerfilAtual = perfil) {
  const local = { pathname: caminho };
  function Espiao() {
    local.pathname = useLocation().pathname;
    return null;
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[caminho]}>
        <Navbar perfil={perfilAtual} />
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

    const voltar = screen.getByRole("button", { name: "Back to Projects" });
    expect(voltar).toHaveTextContent("Projects");
    await user.click(voltar);
    await waitFor(() => expect(local.pathname).toBe("/projetos"));
  });

  it("não aparece nas páginas da sidebar", async () => {
    await i18n.changeLanguage("en");
    renderEm("/projetos");

    expect(screen.queryByRole("button", { name: /^Back/ })).not.toBeInTheDocument();
  });
});

describe("avatar do usuário logado", () => {
  const comNome = (nome: string) => ({ ...perfil, nome });

  it("mostra as iniciais num avatar decorativo, com o primeiro nome ao lado como nome acessível", async () => {
    await i18n.changeLanguage("en");
    renderEm("/overview", comNome("Ana Carolina Lais"));

    const botao = screen.getByRole("button", { name: "Ana" });
    expect(within(botao).getByText("AL").closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("com um nome só, mostra uma letra", async () => {
    await i18n.changeLanguage("en");
    renderEm("/overview", comNome("Ana"));

    expect(within(screen.getByRole("button", { name: "Ana" })).getByText("A")).toBeInTheDocument();
  });

  it("com o nome vazio, mostra o ícone genérico e o menu continua abrindo", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderEm("/overview", comNome("   "));

    const botao = screen.getByRole("button", { name: "User menu" });
    expect(botao.querySelector("svg.lucide-user-round")).not.toBeNull();
    await user.click(botao);
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
  });

  it("abre o menu com o e-mail e a saída, e fecha ao clicar fora", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderEm("/overview");

    await user.click(screen.getByRole("button", { name: "Caroline" }));
    expect(screen.getByRole("menu", { name: "c@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();

    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
