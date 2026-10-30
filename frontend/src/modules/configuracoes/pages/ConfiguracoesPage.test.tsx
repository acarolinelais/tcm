import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { atualizarCorAvatar, type PerfilAtual } from "@/core/auth/api";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import { Navbar } from "@/core/layout/Navbar";
import i18n from "@/core/i18n";
import { ConfiguracoesPage } from "./ConfiguracoesPage";

const perfil = {
  id: "dev", nome: "Dev", email: "dev@example.com", unidade_id: "u", unidade_nome: "U", perfil_codigo: "USUARIO_PADRAO",
  perfil: "Developer", permissoes: [], times: [], setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
} as PerfilAtual;

vi.mock("@/core/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/auth/api")>();
  return { ...actual, atualizarCorAvatar: vi.fn() };
});

function renderPage() {
  const router = createMemoryRouter([{ path: "/", element: <Outlet context={perfil} />, children: [{ path: "configuracoes", element: <ConfiguracoesPage /> }] }], { initialEntries: ["/configuracoes"] });
  return render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("ConfiguracoesPage", () => {
  it("mostra o título e a preferência de idioma para qualquer perfil", async () => {
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Language" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /English/ }));
    expect(screen.getByRole("menuitem", { name: /Português|Portuguese/ })).toBeInTheDocument();
  });

  it("mostra a cor do avatar abaixo do idioma, com a cor da conta marcada", async () => {
    await i18n.changeLanguage("pt-BR");
    renderPage();

    expect(screen.getByRole("heading", { name: "Cor do avatar" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Cor do avatar" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: "Azul" })).toBeChecked();
  });

  it("ao escolher verde, o avatar da barra superior muda sem recarregar a página", async () => {
    vi.mocked(atualizarCorAvatar).mockResolvedValue({ idioma_preferido: "en", cor_avatar: "verde" });
    await i18n.changeLanguage("en");
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    queryClient.setQueryData(perfilAtualQueryKey(), { ...perfil, nome: "Ana Lais" });
    // Como o AppLayout: a barra e a página leem o mesmo perfil em cache.
    function Layout() {
      const { data } = useQuery<PerfilAtual>({ queryKey: perfilAtualQueryKey(), staleTime: Infinity });
      return data ? <><Navbar perfil={data} /><Outlet context={data} /></> : null;
    }
    const router = createMemoryRouter([{ path: "/", element: <Layout />, children: [{ path: "configuracoes", element: <ConfiguracoesPage /> }] }], { initialEntries: ["/configuracoes"] });
    render(<QueryClientProvider client={queryClient}><RouterProvider router={router} /></QueryClientProvider>);

    const botaoUsuario = screen.getByRole("button", { name: "Ana" });
    const corDoAvatar = () => botaoUsuario.querySelector("[data-slot='avatar-fallback']");
    await waitFor(() => expect(corDoAvatar()).toHaveClass("bg-avatar-1"));
    await user.click(screen.getByRole("radio", { name: "Green" }));

    await waitFor(() => expect(corDoAvatar()).toHaveClass("bg-avatar-6"));
  });
});
