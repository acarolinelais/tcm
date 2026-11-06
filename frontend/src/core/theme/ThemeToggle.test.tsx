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

describe("ThemeToggle com View Transition (spec 049)", () => {
  /** Cada troca roda a atualização na hora e só termina quando o teste chama `terminar`. */
  let trocas: { terminar: () => void }[];

  beforeEach(() => {
    trocas = [];
    document.startViewTransition = vi.fn((atualizar: () => void) => {
      atualizar();
      let terminar = () => {};
      const finished = new Promise<undefined>((resolve) => { terminar = () => resolve(undefined); });
      trocas.push({ terminar });
      return { finished, ready: Promise.resolve(undefined), updateCallbackDone: Promise.resolve(undefined), skipTransition: () => {}, types: new Set() };
    }) as unknown as Document["startViewTransition"];
  });

  afterEach(() => {
    delete (document as Partial<Document>).startViewTransition;
  });

  it("troca o tema pela View Transition e mantém a classe trocando-tema só enquanto ela dura", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const toggle = screen.getByRole("button", { name: "Dark theme" });
    await user.click(toggle);
    expect(document.startViewTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveClass("dark", "trocando-tema");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("dark");
    await act(async () => { trocas[0].terminar(); });
    expect(document.documentElement).not.toHaveClass("trocando-tema");
  });

  it("uma troca pelo teclado no meio da anterior volta o tema, e a classe só sai quando a última acaba", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    await act(async () => { trocas[0].terminar(); });
    expect(document.documentElement).toHaveClass("trocando-tema");
    await act(async () => { trocas[1].terminar(); });
    expect(document.documentElement).not.toHaveClass("trocando-tema");
  });

  it("troca sem transição quando o tema muda em outra aba", () => {
    render(<ThemeToggle />);
    act(() => { window.dispatchEvent(new StorageEvent("storage", { key: THEME_KEY, newValue: "dark" })); });
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("trocando-tema");
    expect(document.startViewTransition).not.toHaveBeenCalled();
  });
});
