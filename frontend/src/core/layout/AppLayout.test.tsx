import { render, screen } from "@testing-library/react";
import { renovarSessao } from "@/core/api/http-client";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import i18n from "@/core/i18n";
import { AppLayout } from "./AppLayout";

vi.mock("@/core/auth/usePerfilAtual", () => ({ usePerfilAtual: vi.fn() }));
vi.mock("@/core/api/http-client", () => ({ renovarSessao: vi.fn() }));
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

describe("AppLayout aba nova sem access token (spec 061)", () => {
  const perfil = { idioma_preferido: "en", senha_alteracao_obrigatoria: false } as PerfilAtual;

  beforeEach(async () => {
    window.sessionStorage.clear();
    await i18n.changeLanguage("en");
    vi.mocked(renovarSessao).mockReset();
    vi.mocked(usePerfilAtual).mockReturnValue({ data: perfil, isLoading: false, error: null } as never);
  });

  function renderizar() {
    render(
      <MemoryRouter initialEntries={["/usuarios"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/usuarios" element={<p>Tela de usuários</p>} />
          </Route>
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("renova a sessão pelo cookie e mostra a tela pedida", async () => {
    vi.mocked(renovarSessao).mockImplementation(async () => {
      window.sessionStorage.setItem("sdf.access", "renovado");
      return true;
    });

    renderizar();

    expect(await screen.findByText("Tela de usuários")).toBeInTheDocument();
    expect(renovarSessao).toHaveBeenCalled();
  });

  it("manda para o login quando a renovação falha", async () => {
    vi.mocked(renovarSessao).mockResolvedValue(false);

    renderizar();

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("manda para o login quando a renovação dá erro de rede", async () => {
    vi.mocked(renovarSessao).mockRejectedValue(new TypeError("Failed to fetch"));

    renderizar();

    expect(await screen.findByText("Tela de login")).toBeInTheDocument();
  });

  it("com access token guardado, não chama a renovação", async () => {
    window.sessionStorage.setItem("sdf.access", "guardado");

    renderizar();

    expect(await screen.findByText("Tela de usuários")).toBeInTheDocument();
    expect(renovarSessao).not.toHaveBeenCalled();
  });
});
