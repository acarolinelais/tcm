import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Dia no fuso do navegador, em AAAA-MM-DD (formato do valor dos filtros de data).
export function formatarDiaIso(data: Date) {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

export function lerDiaIso(dia: string) {
  const [ano, mes, diaDoMes] = dia.split("-").map(Number);
  return new Date(ano, mes - 1, diaDoMes);
}

// Semana ISO 8601 no formato do <input type="week"> e da API: AAAA-Www.
export function semanaIso(data: Date) {
  const quinta = new Date(Date.UTC(data.getFullYear(), data.getMonth(), data.getDate()));
  quinta.setUTCDate(quinta.getUTCDate() + 4 - (quinta.getUTCDay() || 7));
  const ano = quinta.getUTCFullYear();
  const semana = Math.ceil(((quinta.getTime() - Date.UTC(ano, 0, 1)) / 86_400_000 + 1) / 7);
  return `${ano}-W${String(semana).padStart(2, "0")}`;
}

/** Segunda e domingo de uma semana ISO `AAAA-Www`, com o ano e o número dela. */
export function diasDaSemana(valor: string) {
  const [ano, semana] = valor.split("-W").map(Number);
  // 4 de janeiro sempre cai na semana 1 ISO.
  const quatroDeJaneiro = new Date(ano, 0, 4);
  const segunda = new Date(ano, 0, 4 - ((quatroDeJaneiro.getDay() || 7) - 1) + (semana - 1) * 7);
  const domingo = new Date(segunda);
  domingo.setDate(segunda.getDate() + 6);
  return { segunda, domingo, ano, semana };
}
