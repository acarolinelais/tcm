import { describe, expect, it } from "vitest";

import { languages, resources } from "./resources";
import i18n from "./index";
import { formatNumber } from "./format";

describe("translation resources", () => {
  it("supports the account locale codes and has matching keys for every language", () => {
    expect(languages.map(({ code }) => code)).toEqual(["en", "pt-BR", "ko"]);
    const englishKeys = Object.keys(resources.en.translation).sort();
    for (const language of ["pt-BR", "ko"] as const) {
      expect(Object.keys(resources[language].translation).sort()).toEqual(englishKeys);
    }
  });

  it("formats numbers using the active language locale", async () => {
    await i18n.changeLanguage("en");
    expect(formatNumber(1234.5)).toBe("1,234.5");
    await i18n.changeLanguage("pt-BR");
    expect(formatNumber(1234.5)).toBe("1.234,5");
    await i18n.changeLanguage("ko");
    expect(formatNumber(1234.5)).toBe("1,234.5");
  });

  it("localizes the KP display name while keeping its stable profile code", () => {
    expect(resources.en.translation["catalog.profile.KP"]).toBe("Key Person");
    expect(resources["pt-BR"].translation["catalog.profile.KP"]).toBe("Pessoa-chave");
    expect(resources.ko.translation["catalog.profile.KP"]).toBe("핵심 담당자");
    expect(resources.en.translation["catalog.profile.description.KP"]).toBeTruthy();
  });
});
