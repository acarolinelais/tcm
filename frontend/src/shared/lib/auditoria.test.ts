import { describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { rotuloCampoAuditoria, valorAuditoria } from "./auditoria";

describe("rótulos da auditoria", () => {
  it("traduz campos e valores nos três idiomas", () => {
    for (const idioma of ["en", "pt-BR", "ko"] as const) {
      const t = i18n.getFixedT(idioma);
      expect(rotuloCampoAuditoria("difficulty", t), idioma).toBe(t("difficulty"));
      expect(rotuloCampoAuditoria("criacao", t), idioma).toBe(t("auditCreatedRecord"));
      expect(rotuloCampoAuditoria("dev_fix_id", t), idioma).toBe("Dev Fix");
      expect(valorAuditoria("difficulty", "High", t), idioma).toBe(t("difficultyHigh"));
      expect(valorAuditoria("automation_level", "1", t), idioma).toBe(t("automationLevel1"));
    }
    const pt = i18n.getFixedT("pt-BR");
    expect([rotuloCampoAuditoria("responsavel_id", pt), valorAuditoria("difficulty", "High", pt)]).toEqual(["Responsável", "Alta"]);
  });

  it("falha: campo ou valor desconhecido aparece como veio, e vazio vira travessão", () => {
    const t = i18n.getFixedT("pt-BR");

    expect(rotuloCampoAuditoria("coluna_nova", t)).toBe("coluna_nova");
    expect(valorAuditoria("category", "A", t)).toBe("A");
    expect(valorAuditoria("status", null, t)).toBe("—");
  });
});
