import { z } from "zod";

import type { CorAvatar, PerfilAtual } from "@/core/auth/api";
import type { PagedResult } from "@/shared/types/paged-result";

export type StatusProjeto = "Created" | "To Do" | "InProgress" | "Completed" | "Canceled";
export const CATEGORIAS_CASO_TESTE = ["A", "B", "C"] as const;
/** Category não tem tradução: o rótulo é o próprio valor. */
export const OPCOES_CATEGORIA = CATEGORIAS_CASO_TESTE.map((valor) => ({ value: valor, label: valor }));
export const DIFICULDADES_CASO_TESTE = ["Low", "Medium", "High"] as const;
export type CategoriaCasoTeste = (typeof CATEGORIAS_CASO_TESTE)[number];
export type DificuldadeCasoTeste = (typeof DIFICULDADES_CASO_TESTE)[number];
/** Automation Level: o banco guarda só o número; o rótulo existe apenas na tela. */
export const NIVEIS_AUTOMACAO_CASO_TESTE = [1, 2, 3] as const;
export type NivelAutomacaoCasoTeste = (typeof NIVEIS_AUTOMACAO_CASO_TESTE)[number];
/** TC Situation: origem do caso em relação a projetos anteriores. */
export type SituacaoCasoTeste = "New" | "New Step" | "Without Changes";

export const SITUACOES_CASO_TESTE: SituacaoCasoTeste[] = ["New", "New Step", "Without Changes"];
/** Progresso do caso no projeto, na ordem exibida. */
export const STATUS_CASO_TESTE = ["To-Do", "InProgress", "InReview", "InValidation", "Done", "InFixes", "Cancelled"] as const;
export type StatusCasoTeste = (typeof STATUS_CASO_TESTE)[number];
/** Chaves i18n dos rótulos de TC Situation, Status e Difficulty. */
export const ROTULO_SITUACAO: Record<SituacaoCasoTeste, string> = { New: "situationNew", "New Step": "situationNewStep", "Without Changes": "situationWithoutChanges" };
export const ROTULO_STATUS: Record<StatusCasoTeste, string> = { "To-Do": "statusTodo", InProgress: "statusInProgress", InReview: "statusInReview", InValidation: "statusInValidation", Done: "statusDone", InFixes: "statusInFixes", Cancelled: "statusCancelled" };
export const ROTULO_DIFICULDADE: Record<DificuldadeCasoTeste, string> = { Low: "difficultyLow", Medium: "difficultyMedium", High: "difficultyHigh" };
export const ROTULO_AUTOMACAO: Record<NivelAutomacaoCasoTeste, string> = { 1: "automationLevel1", 2: "automationLevel2", 3: "automationLevel3" };

/** Resultados que o filtro por modelo do Form Factor oferece. */
export const OPCOES_RESULTADO = [{ value: "PASS", label: "PASS" }, { value: "FAIL", label: "FAIL" }] as const;

/** Opções `{ value, label }` de um conjunto fechado, com o rótulo traduzido pela chave i18n de cada valor. O `value` é sempre texto, o que os selects pedem (níveis numéricos viram "1", "2", "3"). */
export function opcoesRotuladas<V extends string | number>(valores: readonly V[], rotulos: Record<V, string>, t: (chave: string) => string) {
  return valores.map((valor) => ({ value: String(valor), label: t(rotulos[valor]) }));
}

export interface Projeto {
  id: string;
  unidade_id: string;
  time_id: string;
  app: string;
  one_ui: string;
  nome: string;
  status: StatusProjeto;
  modelos_dispositivo?: string[];
  modelos_ids?: string[];
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
  /** `null` até alguém escolher um nível; depois de definido não volta a vazio. */
  automation_level: NivelAutomacaoCasoTeste | null;
  situation: SituacaoCasoTeste;
  status: StatusCasoTeste;
  responsavel_id: string;
  backup_id: string | null;
  /** Motivo da exclusão (spec 026); só existe com o Status `Cancelled`. Ausente nos TCs antigos. */
  justificativa_exclusao?: string | null;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

/** Gestão de Test Cases (ADR 0015): admin, ou gerente/KP com `test_cases.gerenciar`. O escopo do time a API confere. */
export function perfilGerenciaCasos(perfil: Pick<PerfilAtual, "perfil_codigo" | "permissoes">) {
  return perfil.perfil_codigo === "ADMIN_UNIDADE" || (["GERENTE", "KP"].includes(perfil.perfil_codigo ?? "") && perfil.permissoes.includes("test_cases.gerenciar"));
}

/** Colunas do Kanban na ordem do ciclo (spec 037, RN-02): In Fixes antes de Done. */
export const ORDEM_KANBAN: readonly StatusCasoTeste[] = ["To-Do", "InProgress", "InReview", "InValidation", "InFixes", "Done", "Cancelled"];

export interface KanbanCard extends Pick<CasoTeste, "id" | "tc_id" | "category" | "difficulty" | "situation" | "responsavel_id"> {
  responsavel_nome: string;
  /** Cor que o responsável escolheu para o avatar nas Configurações (spec 036). */
  responsavel_cor_avatar: CorAvatar;
  /** Status para os quais quem consulta pode mover o card; vazio = só leitura. */
  destinos: StatusCasoTeste[];
}

export interface KanbanColuna {
  status: StatusCasoTeste;
  total: number;
  casos: KanbanCard[];
}

export interface KanbanProjeto {
  projeto_id: string;
  total: number;
  colunas: KanbanColuna[];
}

export interface NavegacaoBoard {
  setores: { id: string; nome: string; times: { id: string; nome: string; projetos: Pick<Projeto, "id" | "nome" | "status">[] }[] }[];
}

/** Basta o id e o TC ID para abrir o painel de detalhes pelas tabelas de Test Cases, Form Factor e Resultados gerais (spec 030). */
export type CasoTesteResumo = Pick<CasoTeste, "id" | "tc_id">;

/** Detalhe do Test Case (spec 028): os textos da planilha só vêm no `GET /api/test-cases/{id}`. */
export interface CasoTesteDetalhe extends CasoTeste {
  title: string | null;
  precondition: string | null;
  procedure: string | null;
  expected_result: string | null;
}

export type TextosCasoTeste = Pick<CasoTesteDetalhe, "title" | "precondition" | "procedure" | "expected_result">;

/** Limites dos textos da planilha (spec 028, RN-04), os mesmos de `CasoTeste` no backend. */
export const MAX_TITLE_CASO_TESTE = 500;
export const MAX_TEXTO_CASO_TESTE = 10_000;

/** Limite da justificativa de exclusão (spec 026). */
export const MAX_JUSTIFICATIVA_EXCLUSAO = 500;

/** Link de PR do Test Case (spec 030). Espelha o `LinkPullRequestResponse` do backend. */
export interface LinkPullRequest {
  id: string;
  caso_teste_id: string;
  url: string;
  created_at: string | null;
  created_by: string;
  created_by_nome: string;
}

export interface LinksPullRequest {
  itens: LinkPullRequest[];
  /** Calculado pela API: só a gestão remove (spec 030, RN-04). */
  pode_remover: boolean;
}

/** Mesmas regras de `LinkPullRequest.normalizar_url` no backend (spec 030, RN-02). */
const DOMINIO_PULL_REQUEST = "github.sec.samsung.net";
export const MAX_URL_PULL_REQUEST = 2000;

/** O endereço é o trecho entre `https://` e a primeira `/`, `?` ou `#`. Os espaços das pontas não contam. */
export function problemaUrlPullRequest(url: string): "vazia" | "longa" | "invalida" | "dominio" | null {
  const normalizada = url.trim();
  if (!normalizada) return "vazia";
  if (normalizada.length > MAX_URL_PULL_REQUEST) return "longa";
  const endereco = /^https:\/\/([^/?#]*)/i.exec(normalizada)?.[1];
  if (/\s/.test(normalizada) || !endereco) return "invalida";
  // O endereço inteiro tem de ser o domínio: recusa porta, usuário/senha e subdomínio.
  return endereco.toLowerCase() === DOMINIO_PULL_REQUEST ? null : "dominio";
}

const MENSAGEM_URL_PULL_REQUEST = { vazia: "pullRequestUrlRequired", longa: "pullRequestUrlMax", invalida: "pullRequestUrlInvalid", dominio: "pullRequestUrlDomain" } as const;

export const createLinkPullRequestSchema = (t: (key: string) => string) => z.object({
  url: z.string().trim().superRefine((url, ctx) => {
    const problema = problemaUrlPullRequest(url);
    if (problema) ctx.addIssue({ code: z.ZodIssueCode.custom, message: t(MENSAGEM_URL_PULL_REQUEST[problema]) });
  }),
});

export type LinkPullRequestFormValues = z.infer<ReturnType<typeof createLinkPullRequestSchema>>;

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
  backup_id?: string | null;
  /** Rodada mais recente em que o TC ainda aguarda resultados (spec 023). */
  rodada_pendente_id?: string | null;
}

export interface FormFactorMatriz extends PagedResult<LinhaFormFactor> {
  modelos: ModeloFormFactor[];
  casos_elegiveis?: CasoFormFactorElegivel[];
}

export interface CasoFormFactorElegivel {
  caso_teste_id: string;
  tc_id: string;
  responsavel_id: string;
  backup_id: string | null;
}

export interface FormFactorExecucao extends LinhaFormFactor {
  execucao_id: string;
  data_reportada: string;
  origem: "SDF" | "MANUAL";
  rodada_id?: string | null;
  resultados_registrados?: boolean;
}

export interface FormFactorResultados extends PagedResult<FormFactorExecucao> {
  modelos: ModeloFormFactor[];
}

/** Resultado de um modelo numa data da tela Resultados Gerais (spec 032). */
export interface ResultadoNaData {
  execucao_id: string;
  resultado: string;
  sdf_id: string | null;
  origem: "SDF" | "MANUAL";
}

export interface ExecucaoNaData extends ResultadoNaData {
  data_reportada: string;
}

export interface CasoHistorico {
  caso_teste_id: string;
  tc_id: string;
  responsavel_id: string;
  /** ID do tester (spec 012); null quando o responsável não tem. */
  responsavel_identificador: string | null;
  /** Device da busca ou do filtro, se o caso tem resultado nele; senão, o da execução mais recente (RN-04, RN-10). */
  modelo_padrao_id: string | null;
  /** Por data (`AAAA-MM-DD`) e por modelo: a execução mais recente do dia. */
  resultados: Record<string, Record<string, ResultadoNaData>>;
}

/** Histórico de um projeto: uma página de casos e até 7 datas, da mais recente para a mais antiga (specs 032 e 033).
 * As datas valem para todos os casos filtrados, não só para os da página (ADR 0039). */
export interface HistoricoProjeto extends PagedResult<CasoHistorico> {
  modelos: ModeloFormFactor[];
  datas: string[];
  modelo_destacado_id: string | null;
}

export interface ResumoExecucoes {
  caso_teste_id: string;
  tc_id: string;
  responsavel_identificador: string | null;
  modelos: ModeloFormFactor[];
  /** Todas as datas do caso, em ordem cronológica. */
  datas: string[];
  resultados: Record<string, Record<string, ExecucaoNaData[]>>;
}

export interface FiltrosHistoricoProjeto {
  page?: number;
  pageSize?: number;
  busca?: string;
  tcId?: string;
  modeloDispositivoId?: string;
  /** Um dia (`AAAA-MM-DD`) ou uma semana ISO (`AAAA-Www`). */
  periodo?: string;
}

export interface FiltrosFormFactor {
  page?: number;
  pageSize?: number;
  semana?: string;
  /** Seleção múltipla: o caso entra se o responsável for qualquer um dos escolhidos. */
  responsavelIds?: string[];
  tcId?: string;
  sdfId?: string;
  modeloDispositivoId?: string;
  resultado?: string;
  origem?: "SDF" | "MANUAL";
}

export interface CriarRodadaFormFactorInput {
  sdf_id?: string | null;
}

export interface EnviarResultadosRodadaInput {
  resultados: Record<string, "PASS" | "FAIL">;
}

export interface RodadaFormFactor {
  id: string;
  projeto_id: string;
  sdf_id: string | null;
  created_at: string;
  total_test_cases: number;
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
  nome?: string;
  app: string;
  one_ui: string;
  modelos_ids: string[];
}

export interface AtualizarProjetoInput {
  nome: string;
  app: string;
  one_ui: string;
  time_id: string;
  modelos_ids: string[];
}

export interface CriarCasoTesteInput {
  tc_id: string;
  category: CategoriaCasoTeste;
  difficulty: DificuldadeCasoTeste;
  automation_level?: NivelAutomacaoCasoTeste;
  situation: SituacaoCasoTeste;
  responsavel_id: string;
  backup_id: string;
}

export interface AtualizarCasoTesteInput {
  category?: CategoriaCasoTeste;
  difficulty?: DificuldadeCasoTeste;
  automation_level?: NivelAutomacaoCasoTeste;
  situation?: SituacaoCasoTeste;
  status?: StatusCasoTeste;
  responsavel_id?: string;
  backup_id?: string | null;
  /** Obrigatória junto com `status: "Cancelled"` (spec 026). */
  justificativa_exclusao?: string;
}

/** Códigos de problema da planilha de Test Cases (ADR 0033); o texto é montado no frontend. */
export const CODIGOS_ERRO_PLANILHA = [
  "arquivo_invalido", "planilha_vazia", "cabecalho_duplicado", "coluna_obrigatoria_ausente", "sem_casos",
  "app_ausente", "one_ui_ausente", "valor_obrigatorio", "valor_invalido", "tc_id_duplicado",
  "pessoa_nao_encontrada", "pessoa_ambigua", "pessoa_fora_do_time", "responsavel_igual_backup",
  "texto_muito_longo",
] as const;
export type CodigoErroPlanilha = (typeof CODIGOS_ERRO_PLANILHA)[number];

export interface ErroPlanilha {
  codigo: CodigoErroPlanilha;
  /** Linha da planilha; `null` quando o problema é da planilha inteira. */
  linha: number | null;
  coluna: string | null;
  valor: string | null;
  parametros?: { esperados?: string[]; primeira_linha?: number; maximo?: number } | null;
}
