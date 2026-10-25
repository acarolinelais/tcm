import type { PagedResult } from "@/shared/types/paged-result";

export type StatusProjeto = "Created" | "To Do" | "InProgress" | "Completed" | "Canceled";
export const CATEGORIAS_CASO_TESTE = ["A", "B", "C"] as const;
export const DIFICULDADES_CASO_TESTE = ["Low", "Medium", "High"] as const;
export type CategoriaCasoTeste = (typeof CATEGORIAS_CASO_TESTE)[number];
export type DificuldadeCasoTeste = (typeof DIFICULDADES_CASO_TESTE)[number];
/** TC Situation: origem do caso em relação a projetos anteriores. */
export type SituacaoCasoTeste = "New" | "New Step" | "Without Changes";

export const SITUACOES_CASO_TESTE: SituacaoCasoTeste[] = ["New", "New Step", "Without Changes"];
/** Progresso do caso no projeto, na ordem exibida. */
export const STATUS_CASO_TESTE = ["To-Do", "InProgress", "InReview", "InValidation", "Pass", "Fail"] as const;
export type StatusCasoTeste = (typeof STATUS_CASO_TESTE)[number];
/** Chaves i18n dos rótulos de TC Situation e Status. */
export const ROTULO_SITUACAO: Record<SituacaoCasoTeste, string> = { New: "situationNew", "New Step": "situationNewStep", "Without Changes": "situationWithoutChanges" };
export const ROTULO_STATUS: Record<StatusCasoTeste, string> = { "To-Do": "statusTodo", InProgress: "statusInProgress", InReview: "statusInReview", InValidation: "statusInValidation", Pass: "statusPass", Fail: "statusFail" };

export interface Projeto {
  id: string;
  unidade_id: string;
  time_id: string;
  app: string;
  one_ui: string;
  nome: string;
  status: StatusProjeto;
  modelos_dispositivo?: string[];
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Modelo ativo oferecido no seletor do projeto (GET /api/modelos-dispositivo/opcoes). */
export interface OpcaoModeloDispositivo {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface CasoTeste {
  id: string;
  unidade_id: string;
  projeto_id: string;
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  situation: SituacaoCasoTeste;
  status: StatusCasoTeste;
  responsavel_id: string;
  backup_id: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Coluna da matriz do Form Factor: um modelo vinculado ao projeto. */
export interface ModeloFormFactor {
  id: string;
  nome: string;
}

/** Linha da matriz do Form Factor: um Test Case com o resultado mais recente por modelo. */
export interface LinhaFormFactor {
  caso_teste_id: string;
  tc_id: string;
  responsavel_id: string;
  sdf_id: string | null;
  data_reportada: string | null;
  resultados: Record<string, string>;
}

export interface FormFactorMatriz extends PagedResult<LinhaFormFactor> {
  modelos: ModeloFormFactor[];
}

export interface FormFactorExecucao extends LinhaFormFactor {
  execucao_id: string;
  data_reportada: string;
  origem: "SDF" | "MANUAL";
}

export interface FormFactorResultados extends PagedResult<FormFactorExecucao> {
  modelos: ModeloFormFactor[];
}

export interface LinhaFormFactorGlobal extends LinhaFormFactor {
  projeto_id: string;
  projeto_nome: string;
  modelos_ids: string[];
}

export interface FormFactorGlobal extends PagedResult<LinhaFormFactorGlobal> {
  modelos: ModeloFormFactor[];
  responsaveis: { id: string; identificador: string }[];
}

export interface FormFactorExecucaoGlobal extends FormFactorExecucao {
  projeto_id: string;
  projeto_nome: string;
  modelos_ids: string[];
}

export interface FormFactorResultadosGlobais extends PagedResult<FormFactorExecucaoGlobal> {
  modelos: ModeloFormFactor[];
  responsaveis: { id: string; identificador: string }[];
}

export interface FiltrosFormFactorGlobal extends FiltrosFormFactor {
  projetoId?: string;
}

export interface FiltrosFormFactor {
  page?: number;
  pageSize?: number;
  semana?: string;
  responsavelId?: string;
  tcId?: string;
  sdfId?: string;
  modeloDispositivoId?: string;
  resultado?: string;
  origem?: "SDF" | "MANUAL";
}

export interface CriarRodadaFormFactorInput {
  caso_teste_id: string;
  resultados: Record<string, "PASS" | "FAIL">;
}

export interface ImportacaoProjeto {
  projeto: Projeto;
  quantidade_casos: number;
}

export interface ImportacaoSdf {
  importacao_id: string;
  quantidade_execucoes: number;
  quantidade_resultados: number;
}

export interface CriarProjetoInput {
  time_id: string;
  app: string;
  one_ui: string;
  modelos_ids: string[];
}

export interface AtualizarProjetoInput {
  app: string;
  one_ui: string;
}

export interface CriarCasoTesteInput {
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  situation: SituacaoCasoTeste;
  responsavel_id: string;
  backup_id: string;
}

export interface AtualizarCasoTesteInput {
  category?: CategoriaCasoTeste;
  difficulty?: DificuldadeCasoTeste;
  situation?: SituacaoCasoTeste;
  status?: StatusCasoTeste;
  responsavel_id?: string;
  backup_id?: string | null;
}

/** Códigos de problema da planilha de Test Cases (ADR 0033); o texto é montado no frontend. */
export const CODIGOS_ERRO_PLANILHA = [
  "arquivo_invalido", "planilha_vazia", "cabecalho_duplicado", "coluna_obrigatoria_ausente", "sem_casos",
  "app_ausente", "one_ui_ausente", "valor_obrigatorio", "valor_invalido", "tc_id_duplicado",
  "pessoa_nao_encontrada", "pessoa_ambigua", "pessoa_fora_do_time", "responsavel_igual_backup",
] as const;
export type CodigoErroPlanilha = (typeof CODIGOS_ERRO_PLANILHA)[number];

export interface ErroPlanilha {
  codigo: CodigoErroPlanilha;
  /** Linha da planilha; `null` quando o problema é da planilha inteira. */
  linha: number | null;
  coluna: string | null;
  valor: string | null;
  parametros?: { esperados?: string[]; primeira_linha?: number } | null;
}
