import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { THEME_KEY } from "./use-theme";
import { ThemeToggle } from "./ThemeToggle";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
  await i18n.changeLanguage("en");
});

describe("ThemeToggle", () => {
  it("alterna do claro para o escuro e de volta, guardando a escolha", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Dark theme" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);
    expect(document.documentElement).toHaveClass("dark");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");

    await user.click(toggle);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
  });

  it("começa no tema que o script do index.html aplicou", () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
  });

  it("funciona só pelo teclado, com Enter e Espaço", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(document.documentElement).toHaveClass("dark");
    await user.keyboard(" ");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it.each([["pt-BR", "Tema escuro"], ["ko", "다크 테마"]])("tem nome acessível em %s", async (idioma, nome) => {
    render(<ThemeToggle />);
    await act(() => i18n.changeLanguage(idioma));
    expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
  });

  it("troca o tema mesmo com o armazenamento bloqueado", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("bloqueado", "SecurityError"); });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement).toHaveClass("dark");
  });

  it("acompanha a troca feita em outra aba", () => {
    render(<ThemeToggle />);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" })); });
    expect(document.documentElement).toHaveClass("dark");
    expect(screen.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "true");
  });
});
