import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import i18n from "@/core/i18n";
import { AppLayout } from "./AppLayout";

vi.mock("@/core/auth/usePerfilAtual", () => ({ usePerfilAtual: vi.fn() }));
vi.mock("./Navbar", () => ({ Navbar: () => null }));
vi.mock("./Sidebar", () => ({ Sidebar: () => null }));

function TextoTraduzido() {
  const { t } = useTranslation();
  return <p>{t("newUser")}</p>;
}

describe("AppLayout idioma da conta", () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.sessionStorage.setItem("sdf.access", "sessao-nova");
    await i18n.changeLanguage("en");
    vi.mocked(usePerfilAtual).mockReturnValue({
      data: { idioma_preferido: "pt-BR", senha_alteracao_obrigatoria: false } as PerfilAtual,
      isLoading: false,
      error: null,
    } as never);
  });

  it("aplica a preferência da conta após carregar o perfil em uma sessão nova", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<TextoTraduzido />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Novo usuário")).toBeInTheDocument();
    expect(i18n.resolvedLanguage).toBe("pt-BR");
  });
});
