import { formatarDiaIso } from "@/shared/lib/utils";

import type { OverviewData, OverviewPessoal, OverviewProjeto, OverviewTime } from "../model/overview";

export const overviewMock: OverviewData = {
  total: 60,
  concluidos: 26,
  emAndamento: 22,
  aFazer: 12,
  atribuidos: 9,
  // Os últimos 6 meses a partir de hoje, como na API.
  desempenho: [3, 5, 4, 7, 2, 5].map((concluidos, i) => {
    const hoje = new Date();
    const mes = new Date(hoje.getFullYear(), hoje.getMonth() - 5 + i, 1);
    return { mes: `${mes.getFullYear()}-${String(mes.getMonth() + 1).padStart(2, "0")}`, concluidos };
  }),
};

// Spec 063: os gráficos do KP e do dev no modo de demonstração, com datas a partir de hoje, como na API.

function ultimosDias(quantos: number) {
  const hoje = new Date();
  return Array.from({ length: quantos }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (quantos - 1 - i)));
}

function ultimasSemanas(valores: number[]) {
  const hoje = new Date();
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7));
  return valores.map((concluidos, i) => ({
    semana: formatarDiaIso(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() - 7 * (valores.length - 1 - i))),
    concluidos,
  }));
}

export const overviewTimeMock: OverviewTime = {
  projetos: [
    { id: "mock-projeto-alarm", nome: "Alarm 2.0", app: "Alarm" },
    { id: "mock-projeto-clock", nome: "Clock 9.5", app: "Clock" },
  ],
  criacaoPorDia: [
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", media: 0.8 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", media: 1.4 },
  ],
  concluidosPorDev: [
    { usuarioId: "mock-user-ana", nome: "Ana Souza", concluidos: 9 },
    { usuarioId: "mock-user-daniel", nome: "Daniel Oliveira", concluidos: 6 },
    { usuarioId: "mock-user-rafael", nome: "Rafael Lima", concluidos: 2 },
  ],
  concluidosPorSemana: ultimasSemanas([2, 4, 3, 5, 6, 4, 7, 5, 8, 6, 9, 4]),
  donePorProjeto: [
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", concluidos: 8, total: 24, emAndamento: 10 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", concluidos: 18, total: 36, emAndamento: 12 },
  ],
  andamentoPorTime: [
    { id: "mock-time-automation", nome: "SDF Automation", aFazer: 6, emAndamento: 10, concluidos: 18 },
    { id: "mock-time-site", nome: "Site", aFazer: 6, emAndamento: 12, concluidos: 8 },
  ],
  andamentoPorSetor: [{ id: "mock-setor-engenharia", nome: "Engenharia", aFazer: 12, emAndamento: 22, concluidos: 26 }],
  emCorrecaoPorProjeto: [
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", emCorrecao: 2 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", emCorrecao: 5 },
  ],
  passRatePorProjeto: [
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", aprovados: 30, total: 40 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", aprovados: 41, total: 60 },
  ],
};

// Burndown clássico da spec 071: o planejamento começou há 16 dias e termina daqui a 14; o executado para hoje.
const DIAS_DO_PLANO = 31;
const HOJE_NO_PLANO = 16;

export const overviewProjetoMock: OverviewProjeto = {
  dataPlanejada: formatarDiaIso(new Date(Date.now() + 14 * 86_400_000)),
  metaDiaria: 1.7,
  burndown: Array.from({ length: DIAS_DO_PLANO }, (_, i) => ({
    dia: formatarDiaIso(new Date(Date.now() + (i - HOJE_NO_PLANO) * 86_400_000)),
    planejado: Math.round((36 - (36 * i) / (DIAS_DO_PLANO - 1)) * 10) / 10,
    executado: i <= HOJE_NO_PLANO ? Math.max(36 - Math.round(i * 1.6), 0) : null,
  })),
  passRate: {
    rodadaEm: new Date().toISOString(),
    modelos: [
      { modeloId: "mock-modelo-s26", modelo: "SAMSUNG S26", aprovados: 18, total: 20 },
      { modeloId: "mock-modelo-s25", modelo: "SAMSUNG S25", aprovados: 14, total: 20 },
      { modeloId: "mock-modelo-a56", modelo: "SAMSUNG A56", aprovados: 9, total: 20 },
    ],
  },
};

export const overviewPessoalMock: OverviewPessoal = {
  concluidos: 6,
  atribuidos: 9,
  porDificuldade: { Low: 4, Medium: 3, High: 2 },
  entregasPorDia: ultimosDias(30).map((dia, i) => ({ dia: formatarDiaIso(dia), concluidos: [0, 1, 0, 2, 0, 0, 1][i % 7] })),
  entregasPorSemana: ultimasSemanas([1, 2, 0, 3, 2, 1, 2, 4, 1, 3, 2, 1]),
  projetos: [
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", app: "Alarm", concluidos: 2, emAndamento: 1, atribuidos: 4 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", app: "Clock", concluidos: 4, emAndamento: 2, atribuidos: 5 },
  ],
};
