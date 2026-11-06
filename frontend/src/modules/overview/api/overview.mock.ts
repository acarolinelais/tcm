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

const iso = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;

function ultimosDias(quantos: number) {
  const hoje = new Date();
  return Array.from({ length: quantos }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (quantos - 1 - i)));
}

function ultimasSemanas(valores: number[]) {
  const hoje = new Date();
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - ((hoje.getDay() + 6) % 7));
  return valores.map((concluidos, i) => ({
    semana: iso(new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() - 7 * (valores.length - 1 - i))),
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
    { projetoId: "mock-projeto-alarm", projeto: "Alarm 2.0", concluidos: 8, total: 24 },
    { projetoId: "mock-projeto-clock", projeto: "Clock 9.5", concluidos: 18, total: 36 },
  ],
};

export const overviewProjetoMock: OverviewProjeto = {
  burndown: ultimosDias(30).map((dia, i) => ({
    dia: iso(dia),
    planejado: Math.max(36 - 2 * Math.floor((i * 5) / 7), 0),
    executado: Math.max(36 - Math.round(i * 0.9), 0),
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
  entregasPorDia: ultimosDias(30).map((dia, i) => ({ dia: iso(dia), concluidos: [0, 1, 0, 2, 0, 0, 1][i % 7] })),
  entregasPorSemana: ultimasSemanas([1, 2, 0, 3, 2, 1, 2, 4, 1, 3, 2, 1]),
};
