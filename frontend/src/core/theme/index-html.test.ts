import { afterEach, describe, expect, it, vi } from "vitest";

import html from "../../../index.html?raw";
import { THEME_KEY } from "./use-theme";

const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

function executarScript() {
  new Function(script)();
}

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.documentElement.classList.remove("dark");
});

describe("script de tema do index.html", () => {
  it("usa a mesma chave do core/theme", () => {
    expect(script).toContain(`"${THEME_KEY}"`);
  });

  it("aplica o tema escuro guardado", () => {
    window.localStorage.setItem(THEME_KEY, "dark");
    executarScript();
    expect(document.documentElement).toHaveClass("dark");
  });

  it("mantém o claro com valor inválido", () => {
    window.localStorage.setItem(THEME_KEY, "roxo");
    executarScript();
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("mantém o claro sem erro com o armazenamento bloqueado", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("bloqueado", "SecurityError"); });
    expect(executarScript).not.toThrow();
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
