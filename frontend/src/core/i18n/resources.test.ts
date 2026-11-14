import { describe, expect, it } from "vitest";

import { languages, resources } from "./resources";
import i18n from "./index";
import { formatNumber } from "./format";
import { NOME_COR_AVATAR } from "@/shared/lib/cor-avatar";

// Termos que ficam em inglês na interface em português (ADR 0054).
const GLOSSARIO = ["SDF Failures", "My Fixes", "Automation Level", "Pull Requests", "Form Factor", "SDF Result", "Test Cases", "Test Case", "Pass Rate", "Dev Owner", "Dev Fix", "Backup", "Device", "Status", "App"];
// Palavras que se escrevem igual nos dois idiomas, e as siglas.
const MESMA_GRAFIA = ["Manual", "TCs", "SDF", "API"];
// Do mais longo ao mais curto: "Test Cases" sai antes de "Test Case".
const TERMOS = [...GLOSSARIO, ...MESMA_GRAFIA].sort((a, b) => b.length - a.length);
// Nomes de tela e de status que têm rótulo em português e não podem aparecer em inglês no meio de uma frase.
const NOMES_TRADUZIDOS = /\b(Overview|Board|Kanban|Timeline|General Results|To-Do|In Progress|In Review|In Validation|In Fixes|Done|Cancelled|burndown)\b/;

/** Sem palavra a traduzir depois de tirar o glossário, as siglas e as variáveis. */
function semTraducao(texto: string) {
  const resto = TERMOS.reduce((atual, termo) => atual.replaceAll(termo, " "), texto).replace(/\{\{\w+\}\}/g, " ");
  return !/\p{L}/u.test(resto);
}

describe("translation resources", () => {
  it("supports the account locale codes and has matching keys for every language", () => {
    expect(languages.map(({ code }) => code)).toEqual(["en", "pt-BR", "ko"]);
    const englishKeys = Object.keys(resources.en.translation).sort();
    for (const language of ["pt-BR", "ko"] as const) {
      expect(Object.keys(resources[language].translation).sort()).toEqual(englishKeys);
    }
  });

  it("names each language in that language (ADR 0055)", () => {
    expect(languages.map(({ label }) => label)).toEqual(["English", "Português", "한국어"]);
  });

  it("keeps in English only the glossary terms of ADR 0054 in the Portuguese interface", () => {
    const iguais = Object.entries(resources["pt-BR"].translation).filter(([key, value]) => value === resources.en.translation[key as keyof typeof resources.en.translation]);
    expect(iguais.length).toBeGreaterThan(0);
    for (const [key, value] of iguais) expect(semTraducao(value), `pt-BR ${key}: "${value}"`).toBe(true);
  });

  it("flags an English text outside the glossary", () => {
    expect(semTraducao("Save changes")).toBe(false);
    expect(semTraducao("Dev Fix changed.")).toBe(false);
    expect(semTraducao("DONE")).toBe(false);
  });

  it("does not use English screen or status names inside Portuguese sentences", () => {
    for (const [key, value] of Object.entries(resources["pt-BR"].translation)) expect(value, `pt-BR ${key}`).not.toMatch(NOMES_TRADUZIDOS);
    expect("Filtros da Timeline").toMatch(NOMES_TRADUZIDOS);
  });

  it("names the Test Case detail sections in every language", () => {
    for (const language of ["en", "pt-BR", "ko"] as const) {
      const { translation } = resources[language];
      for (const key of ["caseTitle", "casePrecondition", "caseProcedure", "caseExpectedResult", "caseNotFound", "caseDetailsLoadError", "done"] as const) expect(translation[key], `${language} ${key}`).toBeTruthy();
    }
    expect(resources.en.translation.caseProcedure).toBe("Test Procedure(English)");
  });

  it("names the Board header and the Filter button in every language (spec 056)", () => {
    for (const language of ["en", "pt-BR", "ko"] as const) {
      const { translation } = resources[language];
      for (const key of ["boardKanbanHint", "boardPeople", "filterButton", "kanbanNoMatchesHint", "activeFilters_one", "activeFilters_other", "timelineFilters", "timelineEmptyHint", "originSpreadsheet", "viewExecutionHistory", "rowDevices", "resultDescription"] as const) expect(translation[key], `${language} ${key}`).toBeTruthy();
    }
  });

  it("has the PR link section texts in every language", () => {
    const chaves = ["pullRequests", "pullRequestUrl", "noPullRequests", "pullRequestsLoadError", "pullRequestAddedBy", "removePullRequest", "removePullRequestTitle", "removePullRequestDescription", "pullRequestAdded", "pullRequestRemoved", "pullRequestAddError", "pullRequestRemoveError", "pullRequestNotFound", "pullRequestDuplicate", "pullRequestUrlRequired", "pullRequestUrlInvalid", "pullRequestUrlDomain", "pullRequestUrlMax"] as const;
    for (const language of ["en", "pt-BR", "ko"] as const) {
      for (const key of chaves) expect(resources[language].translation[key], `${language} ${key}`).toBeTruthy();
      expect(resources[language].translation.pullRequestUrlDomain).toContain("github.sec.samsung.net");
    }
    expect(resources["pt-BR"].translation.noPullRequests).toBe("Nenhum PR registrado");
  });

  it("names the avatar color section and every palette color in every language", () => {
    const chaves = ["settingsAvatarTitle", "settingsAvatarHint", "avatarColorSaveError", ...Object.values(NOME_COR_AVATAR)] as const;
    for (const language of ["en", "pt-BR", "ko"] as const) {
      for (const key of chaves) expect(resources[language].translation[key], `${language} ${key}`).toBeTruthy();
      expect(new Set(Object.values(NOME_COR_AVATAR).map((key) => resources[language].translation[key])).size, language).toBe(8);
    }
    expect(resources["pt-BR"].translation.settingsAvatarTitle).toBe("Cor do avatar");
  });

  it("labels each Automation Level with its number in every language", () => {
    for (const language of ["en", "pt-BR", "ko"] as const) {
      const { translation } = resources[language];
      expect(translation.automationLevel).toBeTruthy();
      expect(translation.automationLevel1.startsWith("1 - ")).toBe(true);
      expect(translation.automationLevel2.startsWith("2 - ")).toBe(true);
      expect(translation.automationLevel3.startsWith("3 - ")).toBe(true);
    }
    expect(resources["pt-BR"].translation.automationLevel2).toBe("2 - Parcialmente automatizável");
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

  it("translates round and final Status labels in all languages", () => {
    for (const language of ["en", "pt-BR", "ko"] as const) {
      const translation = resources[language].translation;
      expect(translation.createTestRound).toBeTruthy();
      expect(translation.sdfIdOptionalHint).toBeTruthy();
      expect(translation.statusDone).toBeTruthy();
      expect(translation.statusCancelled).toBeTruthy();
      expect(translation.roundCreateError).toBeTruthy();
    }
  });

  it("names the fixes and excluded Status in all languages", () => {
    expect([resources.en.translation.statusInFixes, resources.en.translation.statusCancelled]).toEqual(["In Fixes", "Excluded"]);
    expect([resources["pt-BR"].translation.statusInFixes, resources["pt-BR"].translation.statusCancelled]).toEqual(["Em correção", "Excluído"]);
    expect([resources.ko.translation.statusInFixes, resources.ko.translation.statusCancelled]).toEqual(["수정 중", "제외됨"]);
  });

  it("has the General Results texts (spec 032) in every language", () => {
    const chaves = ["sdfResult", "resultOriginImported", "resultOriginManual", "executionSummary", "testerId", "device", "resultChipLabel", "noRunLabel", "noAccessibleProjects", "noProjectCases", "noCaseRuns", "dayOrWeek"] as const;
    for (const language of ["en", "pt-BR", "ko"] as const) {
      for (const key of chaves) expect(resources[language].translation[key], `${language} ${key}`).toBeTruthy();
      expect(resources[language].translation.sdfResult).toBe("SDF Result");
    }
    expect(resources["pt-BR"].translation.resultOriginImported).toBe("Importado da planilha");
    expect(resources["pt-BR"].translation.resultOriginManual).toBe("Adicionado manualmente");
  });

  it("has the sector deactivation texts (spec 050) with the name in every language", () => {
    for (const language of ["en", "pt-BR", "ko"] as const) {
      for (const key of ["deactivateSectorTitle", "deactivateSectorDescription", "deactivateSectorConfirm"] as const) {
        expect(resources[language].translation[key], `${language} ${key}`).toBeTruthy();
      }
      expect(resources[language].translation.deactivateSectorTitle).toContain("{{name}}");
      expect(resources[language].translation.deactivateSectorDescription).toContain("{{name}}");
    }
  });
});

