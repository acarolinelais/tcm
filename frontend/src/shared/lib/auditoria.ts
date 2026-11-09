import type { TFunction } from "i18next";

// Rótulos da auditoria (spec 052) e da seção Histórico do Test Case (spec 038, Fase 4): ficam em `shared`
// para as duas telas mostrarem os mesmos nomes. Os valores chegam como estão no banco.

/** Chave i18n do nome de cada coluna de `casos_teste` (e do link de PR) que aparece na auditoria. */
const ROTULO_CAMPO: Record<string, string> = {
  criacao: "auditCreatedRecord",
  pull_request: "pullRequestUrl",
  tc_id: "tcId",
  category: "category",
  difficulty: "difficulty",
  automation_level: "automationLevel",
  situation: "tcSituation",
  status: "status",
  responsavel_id: "owner",
  backup_id: "backup",
  justificativa_exclusao: "exclusionJustification",
  title: "caseTitle",
  precondition: "casePrecondition",
  procedure: "caseProcedure",
  expected_result: "caseExpectedResult",
};

// shortcut: repete os ROTULO_* de `modules/projetos/model/projeto.ts`, que `shared` não pode importar; quando
// outra tela precisar deles, os de projetos passam a vir daqui.
const ROTULO_VALOR: Record<string, Record<string, string>> = {
  status: { "To-Do": "statusTodo", InProgress: "statusInProgress", InReview: "statusInReview", InValidation: "statusInValidation", Done: "statusDone", InFixes: "statusInFixes", Cancelled: "statusCancelled" },
  difficulty: { Low: "difficultyLow", Medium: "difficultyMedium", High: "difficultyHigh" },
  situation: { New: "situationNew", "New Step": "situationNewStep", "Without Changes": "situationWithoutChanges" },
  automation_level: { 1: "automationLevel1", 2: "automationLevel2", 3: "automationLevel3" },
};

export function rotuloCampoAuditoria(campo: string, t: TFunction) {
  const chave = ROTULO_CAMPO[campo];
  return chave ? t(chave) : campo;
}

/** O valor como o resto do sistema mostra: Status e demais opções traduzidos; vazio vira "—" (RN-04). */
export function valorAuditoria(campo: string, valor: string | null, t: TFunction) {
  if (valor === null || valor === "") return "—";
  const chave = ROTULO_VALOR[campo]?.[valor];
  return chave ? t(chave) : valor;
}
