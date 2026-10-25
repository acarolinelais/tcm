import "@testing-library/jest-dom/vitest";
import "@/core/i18n";

// O jsdom não implementa estas APIs, que os popups do Base UI (combobox, select) chamam.
HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.setPointerCapture ??= () => undefined;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
HTMLElement.prototype.scrollIntoView ??= () => undefined;
