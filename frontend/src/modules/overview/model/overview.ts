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

export interface OverviewTimeResponse {
  projetos: ProjetoOverview[];
  criacao_por_dia: { projeto_id: string; projeto: string; media: number }[];
  concluidos_por_dev: { usuario_id: string; nome: string; concluidos: number }[];
  concluidos_por_semana: PontoSemana[];
  done_por_projeto: { projeto_id: string; projeto: string; concluidos: number; total: number }[];
}

export interface OverviewTime {
  /** Ativos, em ordem alfabética: o primeiro abre no seletor (RN-04). */
  projetos: ProjetoOverview[];
  criacaoPorDia: { projetoId: string; projeto: string; media: number }[];
  concluidosPorDev: { usuarioId: string; nome: string; concluidos: number }[];
  concluidosPorSemana: PontoSemana[];
  donePorProjeto: { projetoId: string; projeto: string; concluidos: number; total: number }[];
}

export interface PassRateModelo {
  modeloId: string;
  modelo: string;
  aprovados: number;
  total: number;
}

export interface OverviewProjetoResponse {
  burndown: { dia: string; planejado: number; executado: number }[];
  pass_rate: { rodada_em: string; modelos: { modelo_id: string; modelo: string; aprovados: number; total: number }[] } | null;
}

export interface OverviewProjeto {
  /** Os últimos 30 dias, do mais antigo ao de hoje. */
  burndown: { dia: string; planejado: number; executado: number }[];
  /** Null: o projeto ainda não tem rodada de Form Factor. */
  passRate: { rodadaEm: string; modelos: PassRateModelo[] } | null;
}

export interface OverviewPessoalResponse {
  concluidos: number;
  atribuidos: number;
  por_dificuldade: Record<string, number>;
  entregas_por_dia: { dia: string; concluidos: number }[];
  entregas_por_semana: PontoSemana[];
}

export interface OverviewPessoal {
  concluidos: number;
  atribuidos: number;
  porDificuldade: Record<string, number>;
  entregasPorDia: { dia: string; concluidos: number }[];
  entregasPorSemana: PontoSemana[];
}
