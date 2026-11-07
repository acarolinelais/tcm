import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { atualizarIdiomaPreferido, type PerfilAtual } from "@/core/auth/api";
import { perfilAtualQueryKey } from "@/core/auth/usePerfilAtual";
import i18n, { TEMP_LANGUAGE_KEY } from "@/core/i18n";
import { LanguageSelector } from "./LanguageSelector";
import { useTranslation } from "react-i18next";

vi.mock("@/core/auth/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/auth/api")>();
  return { ...actual, atualizarIdiomaPreferido: vi.fn() };
});

function renderComQueryClient(ui: ReactNode) {
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

function LanguageReactiveText() {
  const { t } = useTranslation();
  return <p>{t("newUser")}</p>;
}

describe("LanguageSelector", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("applies and temporarily stores the pre-login selection", async () => {
    renderComQueryClient(<><LanguageSelector /><LanguageReactiveText /></>);
    expect(screen.getByText("New user")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /English/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Portuguese" }));

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("pt-BR"));
    expect(screen.getByText("Novo usuário")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(TEMP_LANGUAGE_KEY)).toBe("pt-BR");
    expect(atualizarIdiomaPreferido).not.toHaveBeenCalled();
  });

  it("in button mode it drops the language icon and still opens the menu", () => {
    renderComQueryClient(<LanguageSelector botao />);
    const gatilho = screen.getByRole("button", { name: /English/ });
    expect(gatilho.querySelectorAll("svg")).toHaveLength(1); // só a seta; o ícone de idioma sai
    fireEvent.click(gatilho);
    expect(screen.getByRole("menuitem", { name: "Portuguese" })).toBeInTheDocument();
  });

  it("saves authenticated selections in the account", async () => {
    vi.mocked(atualizarIdiomaPreferido).mockResolvedValue({ idioma_preferido: "ko", cor_avatar: "azul" });
    renderComQueryClient(<LanguageSelector perfil={{ idioma_preferido: "en" } as never} />);
    fireEvent.click(screen.getByRole("button", { name: /English/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Korean" }));

    await waitFor(() => expect(atualizarIdiomaPreferido).toHaveBeenCalledWith("ko"));
    expect(i18n.resolvedLanguage).toBe("ko");
    expect(window.sessionStorage.getItem(TEMP_LANGUAGE_KEY)).toBeNull();
  });

  it("on failure, restores only the language and keeps an avatar color changed meanwhile", async () => {
    const queryClient = new QueryClient();
    const key = perfilAtualQueryKey();
    queryClient.setQueryData(key, { idioma_preferido: "en", cor_avatar: "azul" });
    let falhar: () => void = () => undefined;
    vi.mocked(atualizarIdiomaPreferido).mockImplementation(() => new Promise((_, reject) => { falhar = () => reject(new Error("500")); }));
    render(<QueryClientProvider client={queryClient}><LanguageSelector perfil={{ idioma_preferido: "en" } as never} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: /English/ }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Korean" }));
    await waitFor(() => expect(atualizarIdiomaPreferido).toHaveBeenCalledWith("ko"));

    queryClient.setQueryData<PerfilAtual>(key, (atual) => atual && { ...atual, cor_avatar: "verde" });
    falhar();

    await waitFor(() => expect(queryClient.getQueryData<PerfilAtual>(key)?.idioma_preferido).toBe("en"));
    expect(queryClient.getQueryData<PerfilAtual>(key)?.cor_avatar).toBe("verde");
  });
});
