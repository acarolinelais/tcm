export interface PontoDesempenho {
  /** AAAA-MM, no fuso do navegador. */
  mes: string;
  concluidos: number;
}

export interface OverviewData {
  total: number;
  concluidos: number;
  emAndamento: number;
  aFazer: number;
  atribuidos: number;
  /** Os últimos 6 meses, do mais antigo para o atual. */
  desempenho: PontoDesempenho[];
}

export interface OverviewResponse {
  total: number;
  concluidos: number;
  em_andamento: number;
  a_fazer: number;
  atribuidos: number;
  desempenho: PontoDesempenho[];
}

// Spec 063: gráficos do time (KP), do projeto escolhido e da visão pessoal (dev).

export interface ProjetoOverview {
  id: string;
  nome: string;
  app: string;
}

export interface PontoSemana {
  /** Segunda-feira, AAAA-MM-DD, no fuso do navegador. */
  semana: string;
  concluidos: number;
}

/** Test Cases de um time ou setor por etapa (spec 064). */
export interface Andamento {
  id: string;
  nome: string;
  aFazer: number;
  emAndamento: number;
  concluidos: number;
}

export interface AndamentoResponse {
  id: string;
  nome: string;
  a_fazer: number;
  em_andamento: number;
  concluidos: number;
}

export interface OverviewTimeResponse {
  projetos: ProjetoOverview[];
  criacao_por_dia: { projeto_id: string; projeto: string; media: number }[];
  concluidos_por_dev: { usuario_id: string; nome: string; concluidos: number }[];
  concluidos_por_semana: PontoSemana[];
  done_por_projeto: { projeto_id: string; projeto: string; concluidos: number; total: number; em_andamento: number }[];
  andamento_por_time: AndamentoResponse[];
  andamento_por_setor: AndamentoResponse[];
  em_correcao_por_projeto: { projeto_id: string; projeto: string; em_correcao: number }[];
  pass_rate_por_projeto: { projeto_id: string; projeto: string; aprovados: number; total: number }[];
  correcoes_por_dev?: { usuario_id: string; nome: string; corrigidas: number; falharam_de_novo: number; media_dias: number | null }[];
}

export interface OverviewTime {
  /** Ativos, em ordem alfabética: o primeiro abre no seletor (RN-04). */
  projetos: ProjetoOverview[];
  criacaoPorDia: { projetoId: string; projeto: string; media: number }[];
  concluidosPorDev: { usuarioId: string; nome: string; concluidos: number }[];
  concluidosPorSemana: PontoSemana[];
  /** `emAndamento`: os cards do projeto escolhido pelo admin (spec 064, RN-12). */
  donePorProjeto: { projetoId: string; projeto: string; concluidos: number; total: number; emAndamento: number }[];
  andamentoPorTime: Andamento[];
  andamentoPorSetor: Andamento[];
  /** Só projetos com algum Test Case em In Fixes. */
  emCorrecaoPorProjeto: { projetoId: string; projeto: string; emCorrecao: number }[];
  /** Spec 076: tentativas fechadas por corretor nos últimos 30 dias; `mediaDias` só das corrigidas. */
  correcoesPorDev?: CorrecoesDev[];
  /** Só projetos com rodada de Form Factor; a rodada mais recente de cada um. */
  passRatePorProjeto: { projetoId: string; projeto: string; aprovados: number; total: number }[];
}

export interface PassRateModelo {
  modeloId: string;
  modelo: string;
  aprovados: number;
  total: number;
}

export interface OverviewProjetoResponse {
  data_planejada: string | null;
  meta_diaria: number | null;
  burndown: { dia: string; planejado: number | null; executado: number | null }[];
  pass_rate: { rodada_em: string; modelos: { modelo_id: string; modelo: string; aprovados: number; total: number }[] } | null;
}

export interface OverviewProjeto {
  /** Spec 071: a data planejada do projeto (AAAA-MM-DD) e a meta de casos por dia útil; null sem data. */
  dataPlanejada: string | null;
  metaDiaria: number | null;
  /**
   * Com data planejada, do início do planejamento até a data (ou até hoje, se ela passou); sem data, os últimos 30
   * dias. Planejado null: sem data planejada. Executado null: dia que ainda não chegou.
   */
  burndown: { dia: string; planejado: number | null; executado: number | null }[];
  /** Null: o projeto ainda não tem rodada de Form Factor. */
  passRate: { rodadaEm: string; modelos: PassRateModelo[] } | null;
}

export interface OverviewPessoalResponse {
  concluidos: number;
  atribuidos: number;
  por_dificuldade: Record<string, number>;
  entregas_por_dia: { dia: string; concluidos: number }[];
  entregas_por_semana: PontoSemana[];
  projetos: { projeto_id: string; projeto: string; app: string; concluidos: number; em_andamento: number; atribuidos: number }[];
}

/** Os Test Cases do dev num projeto em que ele é o responsável principal (spec 064, RN-12). */
export interface ProjetoPessoal {
  projetoId: string;
  projeto: string;
  app: string;
  concluidos: number;
  emAndamento: number;
  atribuidos: number;
}

export interface OverviewPessoal {
  concluidos: number;
  atribuidos: number;
  porDificuldade: Record<string, number>;
  entregasPorDia: { dia: string; concluidos: number }[];
  entregasPorSemana: PontoSemana[];
  /** Em ordem alfabética; o seletor do cabeçalho aparece com dois ou mais. */
  projetos: ProjetoPessoal[];
}

export interface CorrecoesDev {
  usuarioId: string;
  nome: string;
  corrigidas: number;
  falharamDeNovo: number;
  mediaDias: number | null;
}
