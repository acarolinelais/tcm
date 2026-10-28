import "@testing-library/jest-dom/vitest";
import "@/core/i18n";

// O jsdom não implementa estas APIs, que alguns popups e listas chamam.
HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.setPointerCapture ??= () => undefined;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
HTMLElement.prototype.scrollIntoView ??= () => undefined;

// As abas do HeroUI medem a aba ativa para posicionar o indicador; o jsdom não tem ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
// O React Aria espera animações de saída com a Web Animations API, que o jsdom também não tem.
Element.prototype.getAnimations ??= () => [];
