/** Quantas frases cada grupo tem nos textos de tradução (`..._1` até `..._N`). */
export const VARIANTES = 2;

export type Periodo = "manha" | "tarde" | "noite";
export type Etapa = "semCasos" | "naoComecou" | "comecando" | "metade" | "quaseLa" | "ultimo" | "concluido";

/** Hora local de quem abre a Overview: 5h às 11h59 é manhã, 12h às 17h59 é tarde, o resto é noite. */
export const periodoDe = (hora: number): Periodo => (hora >= 5 && hora < 12 ? "manha" : hora >= 12 && hora < 18 ? "tarde" : "noite");

/**
 * Em que ponto do trabalho a pessoa está, pelo escopo do perfil. `ultimo` vem antes das faixas de progresso para as
 * frases de "faltam N" nunca saírem com N = 1 (o plural fica por conta de cada texto).
 */
export function etapaDe(total: number, concluidos: number): Etapa {
  const faltam = total - concluidos;
  if (total === 0) return "semCasos";
  if (faltam <= 0) return "concluido";
  if (faltam === 1) return "ultimo";
  if (concluidos === 0) return "naoComecou";
  const parte = concluidos / total;
  return parte < 0.5 ? "comecando" : parte < 0.8 ? "metade" : "quaseLa";
}

/** `sorteio` é um número de 0 (inclusive) a 1 (exclusive), como o `Math.random()`. */
export const sortear = <T,>(lista: T[], sorteio: number): T => lista[Math.min(Math.floor(sorteio * lista.length), lista.length - 1)];
