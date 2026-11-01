import { formatDate } from "@/core/i18n/format";

import type { Periodo, VisaoTimeline } from "../model/timeline";

function somarDias(data: Date, dias: number) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

/** Dia, semana de segunda a domingo ou mês do calendário que contém `data` (spec 054, RN-03). */
export function periodoDe(visao: VisaoTimeline, data: Date): Periodo {
  const dia = new Date(data.getFullYear(), data.getMonth(), data.getDate());
  if (visao === "dia") return { inicio: dia, fim: dia };
  if (visao === "semana") {
    const inicio = somarDias(dia, -((dia.getDay() + 6) % 7));
    return { inicio, fim: somarDias(inicio, 6) };
  }
  return {
    inicio: new Date(dia.getFullYear(), dia.getMonth(), 1),
    fim: new Date(dia.getFullYear(), dia.getMonth() + 1, 0),
  };
}

/** O período anterior (`passo` -1) ou o seguinte (+1). */
export function avancar(visao: VisaoTimeline, periodo: Periodo, passo: 1 | -1): Periodo {
  const { inicio } = periodo;
  if (visao === "mes") return periodoDe("mes", new Date(inicio.getFullYear(), inicio.getMonth() + passo, 1));
  return periodoDe(visao, somarDias(inicio, passo * (visao === "dia" ? 1 : 7)));
}

/** O começo de cada coluna da grade: as 24 horas na visão Dia, os dias nas outras. */
export function colunas(visao: VisaoTimeline, periodo: Periodo): Date[] {
  const { inicio, fim } = periodo;
  if (visao === "dia") {
    return Array.from({ length: 24 }, (_, hora) => new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), hora));
  }
  const total = Math.round((fim.getTime() - inicio.getTime()) / 86_400_000) + 1;
  return Array.from({ length: total }, (_, i) => somarDias(inicio, i));
}

/** Texto entre as setas: "22 Dec - 4 Jan" na semana, a data no dia e "December 2026" no mês. */
export function rotuloPeriodo(visao: VisaoTimeline, periodo: Periodo) {
  if (visao === "mes") return formatDate(periodo.inicio, { month: "long", year: "numeric" });
  const curto = (data: Date) => formatDate(data, { day: "numeric", month: "short" });
  return visao === "dia" ? curto(periodo.inicio) : `${curto(periodo.inicio)} - ${curto(periodo.fim)}`;
}
