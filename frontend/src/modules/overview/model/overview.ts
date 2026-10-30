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
