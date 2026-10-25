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

  it("translates the default Developer profile name to Portuguese", () => {
    expect(resources.en.translation["catalog.profile.USUARIO_PADRAO"]).toBe("Developer");
    expect(resources["pt-BR"].translation.standardUser).toBe("Desenvolvedor");
    expect(resources["pt-BR"].translation["catalog.profile.USUARIO_PADRAO"]).toBe("Desenvolvedor");
  });

  it("translates project and Test Case table headings while keeping Status stable", () => {
    expect(resources.en.translation.tcId).toBe("TC ID");
    expect(resources["pt-BR"].translation.tcId).toBe("ID do TC");
    expect(resources["pt-BR"].translation.sdfId).toBe("ID do SDF");
    expect(resources["pt-BR"].translation.category).toBe("Categoria");
    expect(resources["pt-BR"].translation.difficulty).toBe("Dificuldade");
    expect(resources["pt-BR"].translation.tcSituation).toBe("Situação do TC");
    expect(resources["pt-BR"].translation.assignee).toBe("Responsável");
    expect(resources["pt-BR"].translation.date).toBe("Data");
    expect(resources["pt-BR"].translation.status).toBe("Status");
  });

  it("translates Test Case and device model forms", () => {
    expect(resources.en.translation.newTestCase).toBe("New Test Case");
    expect(resources["pt-BR"].translation.newTestCase).toBe("Novo caso de teste");
    expect(resources["pt-BR"].translation.editTestCase).toBe("Editar caso de teste");
    expect(resources["pt-BR"].translation.difficultyLow).toBe("Baixa");
    expect(resources["pt-BR"].translation.difficultyMedium).toBe("Média");
    expect(resources["pt-BR"].translation.difficultyHigh).toBe("Alta");
    expect(resources["pt-BR"].translation.statusInProgress).toBe("Em andamento");
    expect(resources.en.translation.statusInValidation).toBe("In Validation");
    expect(resources["pt-BR"].translation.statusInValidation).toBe("Em validação");
    expect(resources.ko.translation.statusInValidation).toBe("검증 중");
    expect(resources["pt-BR"].translation.addDeviceModel).toBe("Novo modelo de dispositivo");
    expect(resources["pt-BR"].translation.deviceModelName).toBe("Nome do modelo");
  });
});
