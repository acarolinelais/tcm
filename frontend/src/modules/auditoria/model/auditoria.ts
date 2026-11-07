import type { TFunction } from "i18next";

import { rotuloCampoAuditoria, valorAuditoria } from "@/shared/lib/auditoria";
import { tomDoToken, type TomEtiqueta } from "@/shared/lib/tom-etiqueta";

/** Espelha `RegistroAuditoriaResponse` da API (spec 052). */
export const ACOES_AUDITORIA = ["criacao", "alteracao", "pr_incluido", "pr_removido"] as const;
export type AcaoAuditoria = (typeof ACOES_AUDITORIA)[number];
export const ORIGENS_AUDITORIA = ["api", "form_factor", "importacao_sdf_desfeita"] as const;
export type OrigemAuditoria = (typeof ORIGENS_AUDITORIA)[number];

export interface AlteracaoAuditoria {
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
}

export interface RegistroAuditoria {
  id: number;
  alterado_em: string;
  usuario_nome: string | null;
  usuario_perfil: string | null;
  acao: AcaoAuditoria;
  caso_teste_id: string;
  tc_id: string;
  projeto_id: string;
  projeto_nome: string;
  alteracoes: AlteracaoAuditoria[];
  origem: string;
  tela: string | null;
}

/** Filtros da RN-05. O período é de dias `AAAA-MM-DD`, com o dia final inteiro. */
export interface FiltrosAuditoria {
  data_inicio?: string;
  data_fim?: string;
  usuario_id?: string[];
  perfil?: string;
  acao?: AcaoAuditoria;
  tc_id?: string;
  projeto_id?: string;
  origem?: OrigemAuditoria;
  tela?: string;
}

/** CA-10: um fim antes do início não vale como filtro. */
export function periodoInvalido({ data_inicio, data_fim }: Pick<FiltrosAuditoria, "data_inicio" | "data_fim">) {
  return Boolean(data_inicio && data_fim && data_fim < data_inicio);
}

export const ROTULO_ACAO: Record<AcaoAuditoria, string> = { criacao: "auditActionCreated", alteracao: "auditActionChanged", pr_incluido: "auditActionPrAdded", pr_removido: "auditActionPrRemoved" };
export const ROTULO_ORIGEM: Record<OrigemAuditoria, string> = { api: "auditOriginApi", form_factor: "auditOriginFormFactor", importacao_sdf_desfeita: "auditOriginUndoneImport" };

/** Cor da etiqueta de cada ação: criar em verde, mudar em azul, PR incluído em índigo, PR removido em vermelho. */
export const TOM_ACAO: Record<AcaoAuditoria, TomEtiqueta> = {
  criacao: tomDoToken("etiqueta-ativo"),
  alteracao: tomDoToken("etiqueta-todo"),
  pr_incluido: tomDoToken("etiqueta-review"),
  pr_removido: tomDoToken("etiqueta-fixes"),
};

/** O Form Factor (e a importação SDF desfeita) se destacam da API, que é a origem comum. */
export const tomOrigem = (origem: string) => tomDoToken(origem === "form_factor" || origem === "importacao_sdf_desfeita" ? "etiqueta-progress" : "etiqueta-neutro");

/** A API devolve a origem como texto: uma origem que a tela ainda não conhece aparece como veio. */
export function rotuloOrigem(origem: string, t: TFunction) {
  const chave = ROTULO_ORIGEM[origem as OrigemAuditoria];
  return chave ? t(chave) : origem;
}

/** "Campo: antes → depois"; a criação é só o nome ("Test Case criado"). */
export function textoAlteracao({ campo, valor_anterior, valor_novo }: AlteracaoAuditoria, t: TFunction) {
  const rotulo = rotuloCampoAuditoria(campo, t);
  if (campo === "criacao") return rotulo;
  return `${rotulo}: ${valorAuditoria(campo, valor_anterior, t)} → ${valorAuditoria(campo, valor_novo, t)}`;
}

/** RN-03: a primeira alteração e "+N" quando a gravação mudou mais de um campo. */
export function resumoAlteracoes({ alteracoes }: Pick<RegistroAuditoria, "alteracoes">, t: TFunction) {
  if (!alteracoes.length) return "—";
  const primeira = textoAlteracao(alteracoes[0], t);
  return alteracoes.length > 1 ? `${primeira} ${t("auditMore", { count: alteracoes.length - 1 })}` : primeira;
}
