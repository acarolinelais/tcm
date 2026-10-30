import type { OverviewData } from "../model/overview";

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
