import { formatDate, formatList, formatNumber } from "@/core/i18n/format";

// Visual comum dos gráficos da Overview (ADR 0051): cores só por token (ADR 0041).
export const ALTURA = 220;

export interface Barra {
  nome: string;
  valor: number;
  /** Texto na ponta da barra no lugar do valor formatado, como "4 (44%)". */
  rotulo?: string;
}

export const eixo = {
  axisLine: false,
  tickLine: false,
  tick: { fill: "var(--muted)", fontSize: 12 },
} as const;

export const grade = { vertical: false, stroke: "var(--separator)" } as const;

export const tooltip = {
  cursor: { fill: "var(--surface-secondary)" },
  contentStyle: {
    background: "var(--overlay)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    color: "var(--foreground)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--foreground)" },
  // Sem isto o texto sai na cor da série, sem contraste sobre o fundo do tooltip.
  itemStyle: { color: "var(--foreground)" },
} as const;

export const porcentagem = (valor: number) => formatNumber(valor / 100, { style: "percent" });

/** Parte de um total em porcentagem inteira; total zero dá 0. */
export const parte = (feitos: number, total: number) => (total ? Math.round((feitos / total) * 100) : 0);

/** "2026-11-05" vira "05/11" (ou "11/05") no idioma da tela, sem o fuso mudar o dia. */
export function diaCurto(dia: string) {
  const [ano, mes, d] = dia.split("-").map(Number);
  return formatDate(new Date(ano, mes - 1, d), { day: "2-digit", month: "2-digit" });
}

/** Resumo em texto das barras para o leitor de tela: "Ana 3 e Bia 0". */
export function resumoDeBarras(barras: Barra[], formatar: (valor: number) => string = (valor) => formatNumber(valor)) {
  return formatList(barras.map((barra) => `${barra.nome} ${barra.rotulo ?? formatar(barra.valor)}`));
}

/** Total das 12 semanas e o da semana atual, já formatados, para o resumo dos gráficos por semana. */
export function totaisDasSemanas(semanas: { concluidos: number }[]) {
  return {
    total: formatNumber(semanas.reduce((soma, semana) => soma + semana.concluidos, 0)),
    last: formatNumber(semanas.at(-1)?.concluidos ?? 0),
  };
}
