import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";
import { Navbar } from "./Navbar";

const perfil = {
  id: "u", nome: "Caroline Souza", email: "c@example.com", unidade_id: "un", unidade_nome: "Un", perfil_codigo: "ADMIN_UNIDADE",
  perfil: "Administrador", permissoes: [], times: [], setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
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

  it("mostra o avatar na cor da conta, decorativo, com o primeiro nome ao lado como nome acessível", async () => {
    await i18n.changeLanguage("en");
    renderEm("/overview", { ...comNome("Ana Carolina Lais"), cor_avatar: "verde" });

    const botao = screen.getByRole("button", { name: "Ana" });
    const avatar = botao.querySelector("[aria-hidden='true']");
    // Sem imagem no jsdom, aparece o fundo da cor; a esfera de cada cor é testada no AvatarUsuario.
    await waitFor(() => expect(avatar?.querySelector("[data-slot='avatar-fallback']")).toHaveClass("bg-avatar-6"));
    expect(avatar).toHaveTextContent("");
  });

  it("com o nome vazio, o avatar continua na cor da conta e o menu continua abrindo", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderEm("/overview", comNome("   "));

    const botao = screen.getByRole("button", { name: "User menu" });
    await waitFor(() => expect(botao.querySelector("[data-slot='avatar-fallback']")).toHaveClass("bg-avatar-1"));
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

  it("Trocar senha no menu fecha o menu e abre o painel de troca", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderEm("/overview");

    await user.click(screen.getByRole("button", { name: "Caroline" }));
    await user.click(screen.getByRole("menuitem", { name: "Change password" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Change password" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Current password/)).toBeInTheDocument();
  });
});

describe("tema na navbar", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("alterna o tema sem perder o texto digitado na busca", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderEm("/overview");
    const busca = screen.getByRole("searchbox", { name: "Search keyword..." });
    await user.type(busca, "login");

    await user.click(screen.getByRole("button", { name: "Dark theme" }));

    expect(document.documentElement).toHaveClass("dark");
    expect(busca).toHaveValue("login");
  });
});

describe("layout da navbar (spec 050)", () => {
  it("separa tema, idioma e usuário com duas divisórias decorativas", () => {
    renderEm("/overview");
    const divisorias = screen.getByRole("banner").querySelectorAll("span[aria-hidden=\"true\"].w-px");

    expect(divisorias).toHaveLength(2);
    expect(divisorias[0].previousElementSibling).toHaveAttribute("aria-pressed");
    expect(divisorias[1].nextElementSibling?.querySelector("[aria-haspopup='menu']")).toHaveAttribute("title", "User menu");
  });
});

