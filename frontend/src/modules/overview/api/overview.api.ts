import { useMock } from "@/core/config";
import { httpGet } from "@/core/api/http-client";

import type {
  OverviewData,
  OverviewPessoal,
  OverviewPessoalResponse,
  OverviewProjeto,
  OverviewProjetoResponse,
  OverviewResponse,
  OverviewTime,
  OverviewTimeResponse,
} from "../model/overview";
import { overviewMock, overviewPessoalMock, overviewProjetoMock, overviewTimeMock } from "./overview.mock";

const noFusoDoNavegador = () => ({ fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone });

export const overviewApi = {
  obter: async (): Promise<OverviewData> => {
    // Modo de demonstração (spec 010): dados de exemplo (spec 039, RN-06).
    if (useMock) return overviewMock;
    const r = await httpGet<OverviewResponse>("/api/overview", noFusoDoNavegador());
    return {
      total: r.total,
      concluidos: r.concluidos,
      emAndamento: r.em_andamento,
      aFazer: r.a_fazer,
      atribuidos: r.atribuidos,
      desempenho: r.desempenho,
    };
  },

  obterTime: async (): Promise<OverviewTime> => {
    if (useMock) return overviewTimeMock;
    const r = await httpGet<OverviewTimeResponse>("/api/overview/time", noFusoDoNavegador());
    return {
      projetos: r.projetos,
      criacaoPorDia: r.criacao_por_dia.map((p) => ({ projetoId: p.projeto_id, projeto: p.projeto, media: p.media })),
      concluidosPorDev: r.concluidos_por_dev.map((d) => ({ usuarioId: d.usuario_id, nome: d.nome, concluidos: d.concluidos })),
      concluidosPorSemana: r.concluidos_por_semana,
      donePorProjeto: r.done_por_projeto.map((p) => ({ projetoId: p.projeto_id, projeto: p.projeto, concluidos: p.concluidos, total: p.total })),
    };
  },

  obterProjeto: async (projetoId: string): Promise<OverviewProjeto> => {
    if (useMock) return overviewProjetoMock;
    const r = await httpGet<OverviewProjetoResponse>(`/api/overview/projetos/${encodeURIComponent(projetoId)}`, noFusoDoNavegador());
    return {
      burndown: r.burndown,
      passRate: r.pass_rate && {
        rodadaEm: r.pass_rate.rodada_em,
        modelos: r.pass_rate.modelos.map((m) => ({ modeloId: m.modelo_id, modelo: m.modelo, aprovados: m.aprovados, total: m.total })),
      },
    };
  },

  obterPessoal: async (): Promise<OverviewPessoal> => {
    if (useMock) return overviewPessoalMock;
    const r = await httpGet<OverviewPessoalResponse>("/api/overview/pessoal", noFusoDoNavegador());
    return {
      concluidos: r.concluidos,
      atribuidos: r.atribuidos,
      porDificuldade: r.por_dificuldade,
      entregasPorDia: r.entregas_por_dia,
      entregasPorSemana: r.entregas_por_semana,
    };
  },
};
