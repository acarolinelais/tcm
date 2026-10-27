import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";
import { ConfiguracoesPage } from "./ConfiguracoesPage";

const perfil = {
  id: "dev", nome: "Dev", email: "dev@example.com", unidade_id: "u", unidade_nome: "U", perfil_codigo: "USUARIO_PADRAO",
  perfil: "Developer", permissoes: [], times: [], setores_gerenciados: [], time_atual_id: null, tem_multiplos_times: false,
  senha_alteracao_obrigatoria: false, idioma_preferido: "en",
} as PerfilAtual;

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
});
