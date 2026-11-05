import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { THEME_KEY } from "./use-theme";
import { ThemeToggle } from "./ThemeToggle";

afterEach(async () => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark", "trocando-tema");
  await i18n.changeLanguage("en");
});

describe("ThemeToggle", () => {
  it("tem o desenho do protótipo (spec 050): círculo de 29px com borda, ícone do tema em uso e toque imediato", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const botao = screen.getByRole("button", { name: "Dark theme" });

    expect(botao).toHaveClass("size-[29px]", "rounded-full", "border-edge", "bg-surface", "active:scale-[0.97]", "motion-reduce:active:scale-100");
    expect(botao.querySelector("svg")).toHaveClass("lucide-sun");
    await user.click(botao);
    // No escuro, a lua com brilho do Figma (10×10, na cor do texto), e não mais o ícone da biblioteca.
    const lua = botao.querySelector("svg");
    expect(lua).not.toHaveClass("lucide-sun");
    expect(lua).toHaveAttribute("viewBox", "0 0 10 10");
    expect(lua).toHaveAttribute("fill", "currentColor");
  });

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

  it("monta um ícone novo, com a animação de entrada, a cada troca", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Dark theme" });
    const iconeAntes = toggle.querySelector("svg");
    // Ao carregar a página, o ícone aparece parado.
    expect(iconeAntes).not.toHaveClass("tema-icone-entrar");
    await user.click(toggle);
    const iconeDepois = toggle.querySelector("svg");
    expect(iconeDepois).not.toBe(iconeAntes);
    expect(iconeDepois).toHaveClass("tema-icone-entrar");
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

describe("ThemeToggle com transição de cores (spec 049)", () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("troca o tema na hora e mantém a transição de cores só durante a troca", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "Dark theme" }));
    expect(document.documentElement).toHaveClass("dark", "trocando-tema");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    act(() => { vi.advanceTimersByTime(800); });
    expect(document.documentElement).not.toHaveClass("trocando-tema");
  });

  it("um clique no meio da troca volta o tema e recomeça a contagem", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Dark theme" });
    await user.click(toggle);
    act(() => { vi.advanceTimersByTime(300); });
    await user.click(toggle);
    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    act(() => { vi.advanceTimersByTime(300); });
    expect(document.documentElement).toHaveClass("trocando-tema");
    act(() => { vi.advanceTimersByTime(500); });
    expect(document.documentElement).not.toHaveClass("trocando-tema");
  });

  it("troca sem transição quando o tema muda em outra aba", () => {
    render(<ThemeToggle />);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" })); });
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("trocando-tema");
  });
});
